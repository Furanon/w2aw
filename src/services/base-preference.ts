import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { KafkaMessageValue } from '@/lib/kafka/types';
import { PreferenceProducer } from '@/lib/kafka/producers/preference';
import { UserWithId } from '@/types/auth';
import { InferSelectModel } from 'drizzle-orm';
import { PostgresError } from '@/types/error';
import { logger } from '@/lib/logger';

/**
 * Generic filter options for preferences
 */
export interface BasePreferenceFilterOptions<T extends Record<string, any>> {
  userId?: string;
  limit?: number;
  offset?: number;
  orderBy?: keyof T & string;
  order?: 'asc' | 'desc';
}

/**
 * Base preference action types
 */
export type PreferenceAction = 'like' | 'unlike' | 'update';

/**
 * Base preference error types
 */
export enum PreferenceErrorType {
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  KAFKA_ERROR = 'KAFKA_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Base preference error class
 */
export class PreferenceError extends Error {
  type: PreferenceErrorType;
  statusCode: number;
  details?: any;

  constructor(type: PreferenceErrorType, message: string, details?: any) {
    super(message);
    this.type = type;
    this.details = details;
    this.name = 'PreferenceError';
    
    // Set appropriate status code based on error type
    switch (type) {
      case PreferenceErrorType.NOT_FOUND:
        this.statusCode = 404;
        break;
      case PreferenceErrorType.ALREADY_EXISTS:
        this.statusCode = 409;
        break;
      case PreferenceErrorType.VALIDATION_FAILED:
        this.statusCode = 400;
        break;
      case PreferenceErrorType.KAFKA_ERROR:
      case PreferenceErrorType.DATABASE_ERROR:
        this.statusCode = 500;
        break;
      default:
        this.statusCode = 500;
    }
  }
}

/**
 * Base Preference Service
 * Provides common functionality for preference management
 * 
 * @template T - Table schema type
 * @template I - Input data type
 * @template S - Select model type
 */
export abstract class BasePreferenceService<
  T extends { id: number },
  I extends Record<string, any>,
  S extends Record<string, any> = InferSelectModel<T>
> {
  protected producer: PreferenceProducer;
  protected table: any;
  protected idField: keyof T & string;
  protected userIdField: keyof T & string;
  protected targetIdField: keyof T & string;
  protected preferenceType: string;

  constructor(
    table: any,
    idField: keyof T & string,
    userIdField: keyof T & string,
    targetIdField: keyof T & string,
    preferenceType: string
  ) {
    this.table = table;
    this.idField = idField;
    this.userIdField = userIdField;
    this.targetIdField = targetIdField;
    this.preferenceType = preferenceType;
    this.producer = PreferenceProducer.getInstance();
  }

  /**
   * Handle preference action (like/unlike/update)
   */
  public async handlePreferenceAction(
    user: UserWithId,
    action: PreferenceAction,
    input: I
  ): Promise<S> {
    try {
      // Validate input data based on action
      this.validateInput(action, input);

      let result: S;

      switch (action) {
        case 'like':
          result = await this.createPreference(user, input);
          break;
        case 'unlike':
          result = await this.removePreference(user, input);
          break;
        case 'update':
          result = await this.updatePreference(user, input);
          break;
        default:
          throw new PreferenceError(
            PreferenceErrorType.VALIDATION_FAILED,
            `Invalid action: ${action}`,
          );
      }

      // Publish event to Kafka
      await this.publishEvent(action, user.id, result);
      
      return result;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get preferences based on filter options
   */
  public async getPreferences(
    options: BasePreferenceFilterOptions<S> = {}
  ): Promise<S[]> {
    try {
      let query = db.select().from(this.table);

      // Apply filters
      if (options.userId) {
        query = query.where(eq(this.table[this.userIdField], options.userId));
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.offset(options.offset);
      }

      // Apply sorting
      if (options.orderBy) {
        const order = options.order === 'desc' ? 'desc' : 'asc';
        query = query.orderBy(this.table[options.orderBy], order);
      } else {
        // Default sort by id
        query = query.orderBy(this.table[this.idField], 'desc');
      }

      const results = await query;
      return results as S[];
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get preference by ID
   */
  public async getPreferenceById(id: number): Promise<S | null> {
    try {
      const preferences = await db
        .select()
        .from(this.table)
        .where(eq(this.table[this.idField], id))
        .limit(1);

      return preferences.length > 0 ? (preferences[0] as S) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get preference by user ID and target ID
   */
  public async getPreferenceByUserAndTarget(
    userId: string,
    targetId: number | string
  ): Promise<S | null> {
    try {
      const preferences = await db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table[this.userIdField], userId),
            eq(this.table[this.targetIdField], targetId)
          )
        )
        .limit(1);

      return preferences.length > 0 ? (preferences[0] as S) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle various error types with appropriate response 
   */
  protected handleError(error: any): never {
    logger.error('Preference service error:', error);

    if (error instanceof PreferenceError) {
      throw error;
    }

    if (error.code === '23505') {
      // Unique constraint violation
      throw new PreferenceError(
        PreferenceErrorType.ALREADY_EXISTS,
        'Preference already exists',
        error
      );
    }

    if (error.code && error.code.startsWith('23')) {
      // Database constraint error
      throw new PreferenceError(
        PreferenceErrorType.DATABASE_ERROR,
        'Database constraint violation',
        error
      );
    }

    if (error instanceof PostgresError) {
      throw new PreferenceError(
        PreferenceErrorType.DATABASE_ERROR,
        'Database error',
        error
      );
    }

    throw new PreferenceError(
      PreferenceErrorType.UNKNOWN_ERROR,
      error.message || 'An unknown error occurred',
      error
    );
  }

  /**
   * Publish preference event to Kafka
   */
  protected async publishEvent(
    action: PreferenceAction,
    userId: string,
    preference: S
  ): Promise<void> {
    try {
      const eventType = `${this.preferenceType}_${action}`;
      const message: KafkaMessageValue = {
        eventType,
        data: {
          userId,
          preference,
          timestamp: new Date().toISOString(),
        },
      };

      await this.producer.produceMessage(message);
    } catch (error) {
      logger.error('Error publishing preference event:', error);
      // Don't throw here - we want to return the preference data even if Kafka fails
    }
  }

  /**
   * Abstract methods to be implemented by specific preference services
   */
  protected abstract validateInput(action: PreferenceAction, input: I): void;
  protected abstract createPreference(user: UserWithId, input: I): Promise<S>;
  protected abstract updatePreference(user: UserWithId, input: I): Promise<S>;
  protected abstract removePreference(user: UserWithId, input: I): Promise<S>;
}

