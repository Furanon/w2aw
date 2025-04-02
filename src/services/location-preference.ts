import { eq, and, sql, inArray, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { userLocationPreferences, locations } from "../db/schema";
import { BasePreferenceService } from "./base-preference";
import { PreferenceProducer } from "../lib/kafka/producers/preference";
import { logger } from "../lib/logger";
import { 
  LocationPreferenceInput,
  LocationPreferenceFilterOptions,
  LocationPreferenceAction,
  PreferenceType
} from "../types/preference";
import { NotFoundError, ValidationError } from "../lib/errors";

/**
 * Service for managing user location preferences
 * Extends the base preference service with location-specific functionality
 */
export class LocationPreferenceService extends BasePreferenceService<
  typeof userLocationPreferences,
  LocationPreferenceInput,
  LocationPreferenceFilterOptions
> {
  private static instance: LocationPreferenceService;
  private preferenceProducer: PreferenceProducer;

  private constructor() {
    super(userLocationPreferences);
    this.preferenceProducer = PreferenceProducer.getInstance();
  }

  /**
   * Get the singleton instance of LocationPreferenceService
   */
  public static getInstance(): LocationPreferenceService {
    if (!LocationPreferenceService.instance) {
      LocationPreferenceService.instance = new LocationPreferenceService();
    }
    return LocationPreferenceService.instance;
  }

  /**
   * Create or update a location preference
   */
  public async createOrUpdate(
    userId: string,
    input: LocationPreferenceInput
  ): Promise<any> {
    try {
      await this.validateLocationExists(input.locationId);
      
      // Check if preference already exists
      const existingPreference = await db.query.userLocationPreferences.findFirst({
        where: and(
          eq(userLocationPreferences.userId, userId),
          eq(userLocationPreferences.locationId, input.locationId)
        )
      });

      return await db.transaction(async (tx) => {
        let result;
        
        // Create or update the preference
        if (existingPreference) {
          // Update existing preference
          result = await tx
            .update(userLocationPreferences)
            .set({
              maxDistance: input.maxDistance,
              preferredAccessibility: input.preferredAccessibility,
              preferredAmenities: input.preferredAmenities,
              preferredTransportation: input.preferredTransportation,
              updatedAt: new Date()
            })
            .where(and(
              eq(userLocationPreferences.userId, userId),
              eq(userLocationPreferences.locationId, input.locationId)
            ))
            .returning();

          // Publish update event to Kafka
          await this.preferenceProducer.publishPreferenceEvent({
            userId,
            preferenceType: PreferenceType.LOCATION,
            action: LocationPreferenceAction.UPDATE,
            preferenceData: result[0]
          });
        } else {
          // Create new preference
          result = await tx
            .insert(userLocationPreferences)
            .values({
              userId,
              locationId: input.locationId,
              maxDistance: input.maxDistance,
              preferredAccessibility: input.preferredAccessibility,
              preferredAmenities: input.preferredAmenities,
              preferredTransportation: input.preferredTransportation,
              socialData: input.socialData || null
            })
            .returning();

          // Publish create event to Kafka
          await this.preferenceProducer.publishPreferenceEvent({
            userId,
            preferenceType: PreferenceType.LOCATION,
            action: LocationPreferenceAction.LIKE,
            preferenceData: result[0]
          });
        }

        return result[0];
      });
    } catch (error) {
      logger.error('Failed to create or update location preference', { error, userId, input });
      throw this.handleError(error);
    }
  }

  /**
   * Remove a location preference
   */
  public async remove(userId: string, locationId: number): Promise<boolean> {
    try {
      await this.validateLocationExists(locationId);
      
      return await db.transaction(async (tx) => {
        const result = await tx
          .delete(userLocationPreferences)
          .where(and(
            eq(userLocationPreferences.userId, userId),
            eq(userLocationPreferences.locationId, locationId)
          ))
          .returning();

        if (result.length === 0) {
          throw new NotFoundError('Location preference not found');
        }

        // Publish remove event to Kafka
        await this.preferenceProducer.publishPreferenceEvent({
          userId,
          preferenceType: PreferenceType.LOCATION,
          action: LocationPreferenceAction.UNLIKE,
          preferenceData: { locationId }
        });

        return true;
      });
    } catch (error) {
      logger.error('Failed to remove location preference', { error, userId, locationId });
      throw this.handleError(error);
    }
  }

  /**
   * Get locations within a specific distance radius
   */
  public async getLocationsWithinRadius(
    latitude: number,
    longitude: number, 
    radiusInKm: number = 5
  ): Promise<any[]> {
    try {
      // Using Haversine formula to calculate distance between two points on Earth
      const haversineDistance = sql`
        (
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(${locations.latitude})) * 
            cos(radians(${locations.longitude}) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(${locations.latitude}))
          )
        )
      `;

      const nearbyLocations = await db
        .select({
          id: locations.id,
          name: locations.name,
          address: locations.address,
          latitude: locations.latitude,
          longitude: locations.longitude,
          distance: haversineDistance.as('distance')
        })
        .from(locations)
        .where(sql`${haversineDistance} <= ${radiusInKm}`)
        .orderBy(haversineDistance);

      return nearbyLocations;
    } catch (error) {
      logger.error('Failed to get locations within radius', { error, latitude, longitude, radiusInKm });
      throw this.handleError(error);
    }
  }

  /**
   * Get user preferences with optional filtering
   */
  public async getUserPreferences(
    userId: string,
    options?: LocationPreferenceFilterOptions
  ): Promise<any[]> {
    try {
      let query = db
        .select({
          id: userLocationPreferences.id,
          userId: userLocationPreferences.userId,
          locationId: userLocationPreferences.locationId,
          maxDistance: userLocationPreferences.maxDistance,
          preferredAccessibility: userLocationPreferences.preferredAccessibility,
          preferredAmenities: userLocationPreferences.preferredAmenities,
          preferredTransportation: userLocationPreferences.preferredTransportation,
          createdAt: userLocationPreferences.createdAt,
          updatedAt: userLocationPreferences.updatedAt,
          // Join with locations table to get location details
          locationName: locations.name,
          locationAddress: locations.address,
          locationLatitude: locations.latitude,
          locationLongitude: locations.longitude
        })
        .from(userLocationPreferences)
        .leftJoin(
          locations,
          eq(userLocationPreferences.locationId, locations.id)
        )
        .where(eq(userLocationPreferences.userId, userId));

      // Apply filters if provided
      if (options) {
        if (options.locationIds && options.locationIds.length > 0) {
          query = query.where(inArray(userLocationPreferences.locationId, options.locationIds));
        }
        
        if (options.amenities && options.amenities.length > 0) {
          query = query.where(sql`${userLocationPreferences.preferredAmenities} @> ${options.amenities}`);
        }
        
        if (options.accessibility && options.accessibility.length > 0) {
          query = query.where(sql`${userLocationPreferences.preferredAccessibility} @> ${options.accessibility}`);
        }
        
        if (options.maxDistance) {
          query = query.where(lte(userLocationPreferences.maxDistance, options.maxDistance));
        }
      }

      return await query;
    } catch (error) {
      logger.error('Failed to get user location preferences', { error, userId, options });
      throw this.handleError(error);
    }
  }

  /**
   * Get proximity-based recommendations
   */
  public async getProximityRecommendations(
    userId: string,
    latitude: number,
    longitude: number,
    maxDistance: number = 10
  ): Promise<any[]> {
    try {
      // Get user's location preferences
      const userPreferences = await this.getUserPreferences(userId);
      
      // Extract preferred amenities and accessibility features from all preferences
      const preferredAmenities = new Set<string>();
      const preferredAccessibility = new Set<string>();
      
      userPreferences.forEach(pref => {
        pref.preferredAmenities?.forEach((amenity: string) => preferredAmenities.add(amenity));
        pref.preferredAccessibility?.forEach((feature: string) => preferredAccessibility.add(feature));
      });

      // Get locations within the specified radius
      const nearbyLocations = await this.getLocationsWithinRadius(
        latitude,
        longitude,
        maxDistance
      );

      // Score locations based on user preferences
      const scoredLocations = nearbyLocations.map(location => {
        let score = 0;
        
        // Base score inversely proportional to distance (closer = higher score)
        score += (maxDistance - location.distance) / maxDistance * 50;
        
        // Add preferred amenities matching score
        const locationAmenities = location.amenities || [];
        const amenitiesScore = Array.from(preferredAmenities).reduce((acc, amenity) => {
          return acc + (locationAmenities.includes(amenity) ? 10 : 0);
        }, 0);
        
        // Add preferred accessibility matching score
        const locationAccessibility = location.accessibility_features || [];
        const accessibilityScore = Array.from(preferredAccessibility).reduce((acc, feature) => {
          return acc + (locationAccessibility.includes(feature) ? 15 : 0);
        }, 0);
        
        return {
          ...location,
          score: score + amenitiesScore + accessibilityScore
        };
      });

      // Sort by score descending
      return scoredLocations.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Failed to get proximity recommendations', { error, userId, latitude, longitude });
      throw this.handleError(error);
    }
  }

  /**
   * Validate that a location exists
   */
  private async validateLocationExists(locationId: number): Promise<void> {
    const location = await db.query.locations.findFirst({
      where: eq(locations.id, locationId)
    });

    if (!location) {
      throw new ValidationError(`Location with ID ${locationId} not found`);
    }
  }
}

