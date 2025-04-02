import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { userBusinessPreferences } from '@/db/schema';
import { BasePreferenceService } from './base-preference';
import { PreferenceProducer } from '@/lib/kafka/producers/preference';
import { BusinessPreferenceInput, PreferenceAction } from '@/types/preference';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/errors';

/**
 * Service for handling user preferences related to businesses
 */
export class BusinessPreferenceService extends BasePreferenceService<
  typeof userBusinessPreferences,
  BusinessPreferenceInput
> {
  private static instance: BusinessPreferenceService;
  private preferenceProducer: PreferenceProducer;

  private constructor() {
    super(userBusinessPreferences);
    this.preferenceProducer = PreferenceProducer.getInstance();
  }

  /**
   * Returns a singleton instance of BusinessPreferenceService
   */
  public static getInstance(): BusinessPreferenceService {
    if (!BusinessPreferenceService.instance) {
      BusinessPreferenceService.instance = new BusinessPreferenceService();
    }
    return BusinessPreferenceService.instance;
  }

  /**
   * Validates the business preference input data
   */
  protected validateInput(input: BusinessPreferenceInput): void {
    if (!input.businessId) {
      throw new ValidationError('Business ID is required');
    }

    if (input.action === PreferenceAction.LIKE) {
      // Additional validation for like action
      if (input.preferredCategories && !Array.isArray(input.preferredCategories)) {
        throw new ValidationError('Preferred categories must be an array');
      }
      
      if (input.maxPriceRange && typeof input.maxPriceRange !== 'number') {
        throw new ValidationError('Max price range must be a number');
      }
    }
  }

  /**
   * Handles liking a business
   */
  protected async handleLike(userId: string, input: BusinessPreferenceInput): Promise<void> {
    try {
      const newPreference = await db.insert(userBusinessPreferences).values({
        userId,
        businessId: input.businessId,
        preferredCategories: input.preferredCategories || [],
        maxPriceRange: input.maxPriceRange,
        preferredServices: input.preferredServices || [],
        socialData: input.socialData || {},
        locationPreference: input.locationPreference,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning();

      // Publish Kafka event
      await this.preferenceProducer.publishPreferenceEvent({
        userId,
        type: 'business_like',
        entityId: input.businessId,
        data: newPreference[0],
      });

      // If ML feature extraction is enabled, queue for processing
      if (this.config.enableMlFeatures) {
        await this.queueFeatureExtraction(userId, 'business', input.businessId);
      }
    } catch (error) {
      logger.error('Failed to like business', { error, userId, businessId: input.businessId });
      throw error;
    }
  }

  /**
   * Handles unliking a business
   */
  protected async handleUnlike(userId: string, input: BusinessPreferenceInput): Promise<void> {
    try {
      const deletedPreference = await db
        .delete(userBusinessPreferences)
        .where(
          and(
            eq(userBusinessPreferences.userId, userId),
            eq(userBusinessPreferences.businessId, input.businessId)
          )
        )
        .returning();

      if (deletedPreference.length === 0) {
        return; // Preference didn't exist, nothing to unlike
      }

      // Publish Kafka event
      await this.preferenceProducer.publishPreferenceEvent({
        userId,
        type: 'business_unlike',
        entityId: input.businessId,
        data: deletedPreference[0],
      });
    } catch (error) {
      logger.error('Failed to unlike business', { error, userId, businessId: input.businessId });
      throw error;
    }
  }

  /**
   * Handles updating business preferences
   */
  protected async handleUpdate(userId: string, input: BusinessPreferenceInput): Promise<void> {
    try {
      const existingPreference = await db
        .select()
        .from(userBusinessPreferences)
        .where(
          and(
            eq(userBusinessPreferences.userId, userId),
            eq(userBusinessPreferences.businessId, input.businessId)
          )
        );

      if (existingPreference.length === 0) {
        // Convert to a like operation if preference doesn't exist
        return this.handleLike(userId, input);
      }

      const updatedPreference = await db
        .update(userBusinessPreferences)
        .set({
          preferredCategories: input.preferredCategories || existingPreference[0].preferredCategories,
          maxPriceRange: input.maxPriceRange ?? existingPreference[0].maxPriceRange,
          preferredServices: input.preferredServices || existingPreference[0].preferredServices,
          socialData: input.socialData || existingPreference[0].socialData,
          locationPreference: input.locationPreference ?? existingPreference[0].locationPreference,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(userBusinessPreferences.userId, userId),
            eq(userBusinessPreferences.businessId, input.businessId)
          )
        )
        .returning();

      // Publish Kafka event
      await this.preferenceProducer.publishPreferenceEvent({
        userId,
        type: 'business_preference_update',
        entityId: input.businessId,
        data: updatedPreference[0],
      });
    } catch (error) {
      logger.error('Failed to update business preference', { error, userId, businessId: input.businessId });
      throw error;
    }
  }

  /**
   * Gets all business preferences for a user with optional filtering
   */
  public async getUserBusinessPreferences(
    userId: string,
    filters?: { categories?: string[], maxPrice?: number }
  ) {
    try {
      let query = db
        .select()
        .from(userBusinessPreferences)
        .where(eq(userBusinessPreferences.userId, userId));

      // Apply filters if provided
      // Note: This would be more complex in a real implementation
      // as filtering arrays requires additional SQL operations

      return await query;
    } catch (error) {
      logger.error('Failed to get user business preferences', { error, userId });
      throw error;
    }
  }

  /**
   * Queues a business preference for ML feature extraction
   */
  private async queueFeatureExtraction(userId: string, entityType: string, entityId: string): Promise<void> {
    try {
      await this.preferenceProducer.publishPreferenceEvent({
        userId,
        type: 'extract_business_features',
        entityId,
        data: {
          userId,
          entityType,
          entityId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to queue feature extraction', { error, userId, entityId });
      // Don't rethrow - feature extraction is not critical for core functionality
    }
  }
}

