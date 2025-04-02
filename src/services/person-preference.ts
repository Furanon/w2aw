import { InferSelectModel, eq, and, or, inArray, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { userPersonPreferences, users } from '@/db/schema';
import { BasePreferenceService } from './base-preference';
import { PreferenceProducer } from '@/lib/kafka/producers/preference';
import { 
  PersonPreferenceAction, 
  PersonPreferenceInput, 
  PersonPreferenceFilterOptions 
} from '@/types/preference';
import { getFeatureVector } from '@/lib/ml/feature-extraction';
import { logger } from '@/lib/logger';
import { PreferenceFeature } from '@/types/ml';

export class PersonPreferenceService extends BasePreferenceService<
  InferSelectModel<typeof userPersonPreferences>,
  PersonPreferenceInput,
  PersonPreferenceFilterOptions
> {
  private static instance: PersonPreferenceService;

  private constructor() {
    super(
      userPersonPreferences,
      'person',
      PreferenceProducer.getInstance()
    );
  }

  public static getInstance(): PersonPreferenceService {
    if (!PersonPreferenceService.instance) {
      PersonPreferenceService.instance = new PersonPreferenceService();
    }
    return PersonPreferenceService.instance;
  }

  /**
   * Validates person preference input based on action
   */
  protected validateInput(input: PersonPreferenceInput, action: PersonPreferenceAction): void {
    if (action === 'unlike' && !input.targetUserId) {
      throw new Error('Target user ID is required for unlike action');
    }

    if (action === 'like' || action === 'update') {
      if (!input.targetUserId) {
        throw new Error('Target user ID is required');
      }
      
      // Check for valid expertise levels and teaching styles if provided
      if (input.expertiseLevel && !['beginner', 'intermediate', 'advanced', 'expert'].includes(input.expertiseLevel)) {
        throw new Error('Invalid expertise level');
      }
      
      if (input.preferredTeachingStyles && !Array.isArray(input.preferredTeachingStyles)) {
        throw new Error('Preferred teaching styles must be an array');
      }
    }
  }

  /**
   * Create a new person preference or update an existing one
   */
  public async handlePreference(userId: string, input: PersonPreferenceInput, action: PersonPreferenceAction): Promise<{ success: boolean; preference?: InferSelectModel<typeof userPersonPreferences> }> {
    try {
      this.validateInput(input, action);
      
      // Check if target user exists
      if (input.targetUserId) {
        const targetUser = await db.query.users.findFirst({
          where: eq(users.id, input.targetUserId),
        });
        
        if (!targetUser) {
          throw new Error('Target user not found');
        }
      }
      
      switch (action) {
        case 'like':
          return await this.createPreference(userId, input);
        case 'unlike':
          return await this.removePreference(userId, input.targetUserId!);
        case 'update':
          return await this.updatePreference(userId, input);
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      logger.error('Error handling person preference:', error);
      return { success: false };
    }
  }

  /**
   * Create a new person preference
   */
  private async createPreference(userId: string, input: PersonPreferenceInput): Promise<{ success: boolean; preference?: InferSelectModel<typeof userPersonPreferences> }> {
    try {
      // Check if preference already exists
      const existingPreference = await db.query.userPersonPreferences.findFirst({
        where: and(
          eq(userPersonPreferences.userId, userId),
          eq(userPersonPreferences.targetUserId, input.targetUserId!)
        ),
      });
      
      if (existingPreference) {
        return this.updatePreference(userId, input);
      }
      
      // Create new preference
      const result = await db.transaction(async (tx) => {
        // Insert preference
        const newPreference = await tx.insert(userPersonPreferences).values({
          userId: userId,
          targetUserId: input.targetUserId!,
          expertiseLevel: input.expertiseLevel,
          preferredTeachingStyles: input.preferredTeachingStyles,
          reasonForPreference: input.reasonForPreference,
          interestLevel: input.interestLevel || 3, // Default to medium interest
          notificationPreferences: input.notificationPreferences || {
            newEvents: true,
            eventReminders: true,
            announcements: true
          },
          created_at: new Date(),
          updated_at: new Date()
        }).returning();
        
        // Publish event to Kafka
        await this.publishEvent('like', {
          userId,
          targetUserId: input.targetUserId!,
          preferenceId: newPreference[0].id,
          timestamp: new Date().toISOString(),
          metadata: {
            expertiseLevel: input.expertiseLevel,
            preferredTeachingStyles: input.preferredTeachingStyles,
            interestLevel: input.interestLevel
          }
        });
        
        // Extract and store features for ML
        await this.storeFeatures(userId, input, newPreference[0].id);
        
        return newPreference[0];
      });
      
      return { success: true, preference: result };
    } catch (error) {
      logger.error('Error creating person preference:', error);
      return { success: false };
    }
  }

  /**
   * Update an existing person preference
   */
  private async updatePreference(userId: string, input: PersonPreferenceInput): Promise<{ success: boolean; preference?: InferSelectModel<typeof userPersonPreferences> }> {
    try {
      const existingPreference = await db.query.userPersonPreferences.findFirst({
        where: and(
          eq(userPersonPreferences.userId, userId),
          eq(userPersonPreferences.targetUserId, input.targetUserId!)
        ),
      });
      
      if (!existingPreference) {
        return this.createPreference(userId, input);
      }
      
      // Update preference
      const result = await db.transaction(async (tx) => {
        const updatedPreference = await tx.update(userPersonPreferences)
          .set({
            expertiseLevel: input.expertiseLevel,
            preferredTeachingStyles: input.preferredTeachingStyles,
            reasonForPreference: input.reasonForPreference,
            interestLevel: input.interestLevel,
            notificationPreferences: input.notificationPreferences,
            updated_at: new Date()
          })
          .where(and(
            eq(userPersonPreferences.userId, userId),
            eq(userPersonPreferences.targetUserId, input.targetUserId!)
          ))
          .returning();
        
        // Publish event to Kafka
        await this.publishEvent('update', {
          userId,
          targetUserId: input.targetUserId!,
          preferenceId: existingPreference.id,
          timestamp: new Date().toISOString(),
          metadata: {
            expertiseLevel: input.expertiseLevel,
            preferredTeachingStyles: input.preferredTeachingStyles,
            interestLevel: input.interestLevel
          }
        });
        
        // Update features for ML
        await this.storeFeatures(userId, input, existingPreference.id);
        
        return updatedPreference[0];
      });
      
      return { success: true, preference: result };
    } catch (error) {
      logger.error('Error updating person preference:', error);
      return { success: false };
    }
  }

  /**
   * Remove a person preference
   */
  private async removePreference(userId: string, targetUserId: string): Promise<{ success: boolean }> {
    try {
      const existingPreference = await db.query.userPersonPreferences.findFirst({
        where: and(
          eq(userPersonPreferences.userId, userId),
          eq(userPersonPreferences.targetUserId, targetUserId)
        ),
      });
      
      if (!existingPreference) {
        throw new Error('Preference not found');
      }
      
      await db.transaction(async (tx) => {
        await tx.delete(userPersonPreferences)
          .where(and(
            eq(userPersonPreferences.userId, userId),
            eq(userPersonPreferences.targetUserId, targetUserId)
          ));
        
        // Publish event to Kafka
        await this.publishEvent('unlike', {
          userId,
          targetUserId,
          preferenceId: existingPreference.id,
          timestamp: new Date().toISOString()
        });
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error removing person preference:', error);
      return { success: false };
    }
  }

  /**
   * Get person preferences based on filter options
   */
  public async getPreferences(userId: string, options?: PersonPreferenceFilterOptions): Promise<InferSelectModel<typeof userPersonPreferences>[]> {
    try {
      const filters = [];
      
      // Base filter for user
      filters.push(eq(userPersonPreferences.userId, userId));
      
      // Apply additional filters if provided
      if (options) {
        if (options.targetUserId) {
          filters.push(eq(userPersonPreferences.targetUserId, options.targetUserId));
        }
        
        if (options.expertiseLevel) {
          filters.push(eq(userPersonPreferences.expertiseLevel, options.expertiseLevel));
        }
        
        if (options.interestLevelMin) {
          filters.push(gte(userPersonPreferences.interestLevel, options.interestLevelMin));
        }
        
        if (options.interestLevelMax) {
          filters.push(lte(userPersonPreferences.interestLevel, options.interestLevelMax));
        }
        
        if (options.preferredTeachingStyles && options.preferredTeachingStyles.length > 0) {
          // Note: This is a simplification. Actual array overlap filtering depends on the database
          options.preferredTeachingStyles.forEach(style => {
            filters.push(eq(userPersonPreferences.preferredTeachingStyles, style));
          });
        }
      }
      
      const preferences = await db.query.userPersonPreferences.findMany({
        where: and(...filters),
        with: {
          targetUser: true
        },
        orderBy: (options?.orderBy === 'interestLevel')
          ? userPersonPreferences.interestLevel
          : userPersonPreferences.created_at
      });
      
      return preferences;
    } catch (error) {
      logger.error('Error getting person preferences:', error);
      return [];
    }
  }

  /**
   * Extract and store ML features from user preferences
   */
  private async storeFeatures(userId: string, input: PersonPreferenceInput, preferenceId: number): Promise<void> {
    try {
      // Extract features
      const features: PreferenceFeature[] = [
        { 
          name: 'person_expertise_level', 
          value: input.expertiseLevel || 'intermediate',
          weight: 0.7
        },
        { 
          name: 'person_interest_level', 
          value: input.interestLevel?.toString() || '3',
          weight: 0.9
        }
      ];
      
      // Add teaching style features
      if (input.preferredTeachingStyles) {
        input.preferredTeachingStyles.forEach((style, index) => {
          features.push({
            name: `teaching_style_${index}`,
            value: style,
            weight: 0.6
          });
        });
      }
      
      // Get feature vector
      const featureVector = await getFeatureVector(features);
      
      // Store features
      await this.storeFeatureVector(userId, featureVector, {
        preferenceId,
        targetUserId: input.targetUserId!,
        features
      });
    } catch (error) {
      logger.error('Error storing person preference features:', error);
    }
  }
}

