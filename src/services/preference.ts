import { db } from '@/db';
import { userCoursePreferences, preferenceFeatures, courseRecommendations } from '@/db/schema';
import { PreferenceProducer } from '@/lib/kafka/producers/preference';
import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import { PreferenceAction, PreferenceInput, PreferenceFilterOptions } from '@/types/preference';
import { PostgresError } from '@/lib/errors';
import { extractFeatures } from '@/lib/ml/feature-extraction';
import { FeatureExtractionError } from '@/lib/errors/ml';
import { logger } from '@/lib/logger';
import { sql } from 'drizzle-orm';

export class PreferenceService {
  private preferenceProducer: PreferenceProducer;

  constructor() {
    this.preferenceProducer = PreferenceProducer.getInstance();
  }

  /**
   * Handle creating a new preference/like 
   */
  async createPreference(input: PreferenceInput, userId: string): Promise<{ success: boolean; preferenceId?: number; error?: string }> {
    try {
      // Begin a transaction
      return await db.transaction(async (tx) => {
        // Check if preference already exists
        const existingPreference = await tx.query.userCoursePreferences.findFirst({
          where: and(
            eq(userCoursePreferences.userId, userId),
            eq(userCoursePreferences.sourceEventId, input.sourceEventId),
          ),
        });

        if (existingPreference) {
          return { 
            success: false, 
            error: 'Preference already exists for this event' 
          };
        }

        // Insert new preference
        const [newPreference] = await tx.insert(userCoursePreferences).values({
          userId,
          sourceEventId: input.sourceEventId,
          instructorId: input.instructorId,
          preferredTimeStart: input.preferredTimeStart,
          preferredTimeEnd: input.preferredTimeEnd,
          preferredDays: input.preferredDays,
          locationId: input.locationId,
          activityType: input.activityType,
          maxPrice: input.maxPrice,
          socialData: input.socialData || {},
        }).returning();

        // Extract ML features
        try {
          const features = await extractFeatures({
            userId,
            preferenceId: newPreference.id,
            eventData: input,
          });

          // Store features in DB
          await tx.insert(preferenceFeatures).values({
            userId,
            featureVector: features.vector,
            featureMetadata: features.metadata,
            trainingData: features.trainingData,
            lastUpdated: new Date(),
          }).onConflictDoUpdate({
            target: preferenceFeatures.userId,
            set: {
              featureVector: features.vector,
              featureMetadata: features.metadata,
              trainingData: features.trainingData,
              lastUpdated: new Date(),
            },
          });

          // Publish Kafka event
          await this.preferenceProducer.publishPreferenceEvent({
            action: 'like',
            userId,
            preferenceId: newPreference.id,
            eventId: input.sourceEventId,
            timestamp: new Date().toISOString(),
            features: features.metadata,
          });

          return { 
            success: true, 
            preferenceId: newPreference.id 
          };
        } catch (featureError) {
          logger.error('Feature extraction error:', featureError);
          
          // Still create the preference, but log the ML error
          await this.preferenceProducer.publishPreferenceEvent({
            action: 'like',
            userId,
            preferenceId: newPreference.id,
            eventId: input.sourceEventId,
            timestamp: new Date().toISOString(),
            features: null,
          });

          return { 
            success: true, 
            preferenceId: newPreference.id,
            error: 'Preference created but feature extraction failed'
          };
        }
      });
    } catch (error) {
      logger.error('Error creating preference:', error);
      if (error instanceof PostgresError) {
        return { 
          success: false, 
          error: `Database error: ${error.message}` 
        };
      }
      return { 
        success: false, 
        error: 'Failed to create preference' 
      };
    }
  }

  /**
   * Handle removing a preference/unlike
   */
  async removePreference(eventId: number, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await db.transaction(async (tx) => {
        // Find the preference to delete
        const preferenceToDelete = await tx.query.userCoursePreferences.findFirst({
          where: and(
            eq(userCoursePreferences.userId, userId),
            eq(userCoursePreferences.sourceEventId, eventId),
          ),
        });

        if (!preferenceToDelete) {
          return { 
            success: false, 
            error: 'Preference not found' 
          };
        }

        // Delete the preference
        await tx.delete(userCoursePreferences).where(
          eq(userCoursePreferences.id, preferenceToDelete.id)
        );

        // Remove any associated recommendations
        await tx.delete(courseRecommendations).where(
          and(
            eq(courseRecommendations.userId, userId),
            eq(courseRecommendations.eventId, eventId)
          )
        );

        // Publish Kafka event
        await this.preferenceProducer.publishPreferenceEvent({
          action: 'unlike',
          userId,
          preferenceId: preferenceToDelete.id,
          eventId,
          timestamp: new Date().toISOString(),
        });

        return { success: true };
      });
    } catch (error) {
      logger.error('Error removing preference:', error);
      if (error instanceof PostgresError) {
        return { 
          success: false, 
          error: `Database error: ${error.message}` 
        };
      }
      return { 
        success: false, 
        error: 'Failed to remove preference' 
      };
    }
  }

  /**
   * Handle updating an existing preference
   */
  async updatePreference(input: PreferenceInput, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await db.transaction(async (tx) => {
        // Find the preference to update
        const existingPreference = await tx.query.userCoursePreferences.findFirst({
          where: and(
            eq(userCoursePreferences.userId, userId),
            eq(userCoursePreferences.sourceEventId, input.sourceEventId),
          ),
        });

        if (!existingPreference) {
          return { 
            success: false, 
            error: 'Preference not found' 
          };
        }

        // Update the preference
        const [updatedPreference] = await tx.update(userCoursePreferences)
          .set({
            instructorId: input.instructorId,
            preferredTimeStart: input.preferredTimeStart,
            preferredTimeEnd: input.preferredTimeEnd,
            preferredDays: input.preferredDays,
            locationId: input.locationId,
            activityType: input.activityType,
            maxPrice: input.maxPrice,
            socialData: input.socialData || existingPreference.socialData,
          })
          .where(eq(userCoursePreferences.id, existingPreference.id))
          .returning();

        // Extract and update ML features
        try {
          const features = await extractFeatures({
            userId,
            preferenceId: existingPreference.id,
            eventData: input,
          });

          // Update features in DB
          await tx.insert(preferenceFeatures).values({
            userId,
            featureVector: features.vector,
            featureMetadata: features.metadata,
            trainingData: features.trainingData,
            lastUpdated: new Date(),
          }).onConflictDoUpdate({
            target: preferenceFeatures.userId,
            set: {
              featureVector: features.vector,
              featureMetadata: features.metadata,
              trainingData: features.trainingData,
              lastUpdated: new Date(),
            },
          });

          // Publish Kafka event
          await this.preferenceProducer.publishPreferenceEvent({
            action: 'update',
            userId,
            preferenceId: existingPreference.id,
            eventId: input.sourceEventId,
            timestamp: new Date().toISOString(),
            features: features.metadata,
          });

          return { success: true };
        } catch (featureError) {
          logger.error('Feature extraction error during update:', featureError);
          
          // Still update the preference, but log the ML error
          await this.preferenceProducer.publishPreferenceEvent({
            action: 'update',
            userId,
            preferenceId: existingPreference.id,
            eventId: input.sourceEventId,
            timestamp: new Date().toISOString(),
            features: null,
          });

          return { 
            success: true, 
            error: 'Preference updated but feature extraction failed'
          };
        }
      });
    } catch (error) {
      logger.error('Error updating preference:', error);
      if (error instanceof PostgresError) {
        return { 
          success: false, 
          error: `Database error: ${error.message}` 
        };
      }
      return { 
        success: false, 
        error: 'Failed to update preference' 
      };
    }
  }

  /**
   * Get user preferences with optional filtering
   */
  async getUserPreferences(
    userId: string, 
    options?: PreferenceFilterOptions
  ): Promise<{ success: boolean; preferences?: any[]; error?: string }> {
    try {
      // Build the query conditions
      let conditions = [eq(userCoursePreferences.userId, userId)];
      
      if (options?.activityType) {
        conditions.push(eq(userCoursePreferences.activityType, options.activityType));
      }
      
      if (options?.instructorId) {
        conditions.push(eq(userCoursePreferences.instructorId, options.instructorId));
      }
      
      if (options?.locationId) {
        conditions.push(eq(userCoursePreferences.locationId, options.locationId));
      }
      
      if (options?.preferredDays && options.preferredDays.length > 0) {
        // This is a simplification - in reality, you'd need more complex array overlap logic
        conditions.push(sql`${userCoursePreferences.preferredDays} && ${options.preferredDays}`);
      }
      
      if (options?.timeStart && options.timeEnd) {
        conditions.push(
          and(
            lte(userCoursePreferences.preferredTimeStart, options.timeEnd),
            gte(userCoursePreferences.preferredTimeEnd, options.timeStart)
          )
        );
      }
      
      // Execute the query with all conditions
      const preferences = await db.query.userCoursePreferences.findMany({
        where: and(...conditions),
        with: {
          // Include any relationships we want to return
          // For example, if we had relationships defined:
          // event: true,
          // instructor: true,
        },
        orderBy: (fields, { desc }) => [desc(fields.createdAt)],
      });
      
      return {
        success: true,
        preferences,
      };
    } catch (error) {
      logger.error('Error fetching preferences:', error);
      if (error instanceof PostgresError) {
        return { 
          success: false, 
          error: `Database error: ${error.message}` 
        };
      }
      return { 
        success: false, 
        error: 'Failed to fetch preferences' 
      };
    }
  }

  /**
   * Process preference action based on the specified action type
   */
  async processPreferenceAction(
    action: PreferenceAction,
    input: PreferenceInput,
    userId: string
  ): Promise<{ success: boolean; preferenceId?: number; error?: string }> {
    switch (action) {
      case 'like':
        return this.createPreference(input, userId);
      case 'unlike':
        return this.removePreference(input.sourceEventId, userId);
      case 'update':
        return this.updatePreference(input, userId);
      default:
        return {
          success: false,
          error: `Unsupported action: ${action}`,
        };
    }
  }
}

// Export a singleton instance
export const preferenceService = new PreferenceService();

