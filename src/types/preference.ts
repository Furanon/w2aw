import { z } from 'zod';
import { PreferenceKafkaMessage } from '../lib/kafka/producers/preference';

/**
 * Enum representing all possible preference actions
 */
export enum PreferenceAction {
  LIKE = 'like',
  UNLIKE = 'unlike',
  UPDATE = 'update'
}

/**
 * Enum for different types of recommendations
 */
export enum RecommendationType {
  INSTRUCTOR = 'instructor',
  TIME_SLOT = 'time_slot',
  LOCATION = 'location',
  SIMILAR_COURSE = 'similar_course',
  PRICE_ALERT = 'price_alert'
}

/**
 * Input schema for creating/updating a preference
 */
export const preferenceInputSchema = z.object({
  action: z.enum([PreferenceAction.LIKE, PreferenceAction.UNLIKE, PreferenceAction.UPDATE]),
  sourceEventId: z.number().int().positive(),
  instructorId: z.string().uuid().optional(),
  preferredTimeStart: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  preferredTimeEnd: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  preferredDays: z.array(z.number().int().min(1).max(7)).optional(),
  locationId: z.number().int().positive().optional(),
  activityType: z.string().optional(),
  maxPrice: z.number().positive().optional(),
  socialData: z.record(z.any()).optional()
});

export type PreferenceInput = z.infer<typeof preferenceInputSchema>;

/**
 * Interface for preference filter options when querying preferences
 */
export interface PreferenceFilterOptions {
  userId?: string;
  instructorId?: string;
  locationId?: number;
  activityType?: string;
  preferredDays?: number[];
  startDateAfter?: Date;
  startDateBefore?: Date;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

/**
 * Interface for a complete preference record with all fields
 */
export interface PreferenceRecord {
  id: number;
  userId: string;
  sourceEventId: number;
  instructorId?: string;
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  preferredDays?: number[];
  locationId?: number;
  activityType?: string;
  maxPrice?: number;
  socialData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for preference feature vector data
 */
export interface PreferenceFeature {
  id: number;
  userId: string;
  featureVector: number[];
  featureMetadata: Record<string, any>;
  trainingData: Record<string, any>;
  lastUpdated: Date;
  createdAt: Date;
}

/**
 * Interface for course recommendation data
 */
export interface CourseRecommendation {
  id: number;
  userId: string;
  eventId: number;
  score: number;
  similarityScore: number;
  recommendationReason: Record<string, any>;
  recommendationType: RecommendationType;
  notified: boolean;
  notificationSentAt?: Date;
  createdAt: Date;
}

/**
 * Interface for preference notification options
 */
export interface PreferenceNotificationOptions {
  immediate: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
  notifyOnPriceChange: boolean;
  notifyOnAvailability: boolean;
  minimumScore: number;
}

/**
 * Response from the preference API
 */
export interface PreferenceResponse {
  success: boolean;
  data?: PreferenceRecord | PreferenceRecord[];
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * Type for feature extraction functions
 */
export type FeatureExtractor = (preference: PreferenceRecord) => Promise<number[]>;

/**
 * Interface for ML model input
 */
export interface ModelInput {
  userId: string;
  preferenceFeatures: number[];
  courseFeatures: number[];
  contextFeatures?: number[];
}

/**
 * Interface for ML model output
 */
export interface ModelOutput {
  score: number;
  confidence: number;
  explanation: Record<string, any>;
}

