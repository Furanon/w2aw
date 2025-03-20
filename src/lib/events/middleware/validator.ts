import { z } from 'zod';
import { Kafka } from 'kafkajs';
import { logger } from '../../logger';

/**
 * Error class for Kafka message validation failures
 */
export class KafkaValidationError extends Error {
  constructor(
    message: string,
    public readonly schema: string,
    public readonly errors: z.ZodError | null,
    public readonly topic: string,
    public readonly rawMessage: unknown
  ) {
    super(message);
    this.name = 'KafkaValidationError';
  }
}

/**
 * Options for the validator middleware
 */
export interface ValidatorOptions {
  /**
   * Whether to log successful validations (default: false)
   */
  logSuccess?: boolean;
  
  /**
   * Whether to throw errors on validation failure (default: true for producers, false for consumers)
   */
  throwOnError?: boolean;
}

/**
 * A middleware for validating Kafka messages using Zod schemas
 */
export class KafkaMessageValidator {
  /**
   * Validates a message using the provided Zod schema
   *
   * @param schema The Zod schema to validate against
   * @param message The message to validate
   * @param topic The Kafka topic the message is for
   * @param options Validation options
   * @returns The validated message (cast to the schema's inferred type)
   * @throws KafkaValidationError if validation fails and throwOnError is true
   */
  static validate<T extends z.ZodType>(
    schema: T,
    message: unknown,
    topic: string,
    options: ValidatorOptions = {}
  ): z.infer<T> {
    const { logSuccess = false, throwOnError = true } = options;
    
    try {
      // Parse and validate the message against the schema
      const validatedMessage = schema.parse(message);
      
      if (logSuccess) {
        logger.debug(`Message validation successful for topic: ${topic}`, {
          topic,
          schemaName: schema.description || 'Unknown schema'
        });
      }
      
      return validatedMessage;
    } catch (error) {
      const zodError = error instanceof z.ZodError ? error : null;
      const errorMessage = zodError 
        ? `Message validation failed for topic ${topic}: ${zodError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        : `Message validation failed for topic ${topic}: ${error instanceof Error ? error.message : String(error)}`;
      
      logger.error(errorMessage, {
        topic,
        schemaName: schema.description || 'Unknown schema',
        errors: zodError?.errors || [],
        message: typeof message === 'object' ? message : String(message)
      });
      
      if (throwOnError) {
        throw new KafkaValidationError(
          errorMessage,
          schema.description || 'Unknown schema',
          zodError,
          topic,
          message
        );
      }
      
      return null as unknown as z.infer<T>;
    }
  }
  
  /**
   * Creates a producer middleware for validating messages before they are sent
   *
   * @param schema The Zod schema to validate against
   * @param options Validation options
   * @returns A Kafka producer middleware function
   */
  static producerMiddleware<T extends z.ZodType>(
    schema: T, 
    options: ValidatorOptions = {}
  ) {
    return ({ topic, messages }: { topic: string; messages: Array<{ value: any }> }) => {
      return {
        topic,
        messages: messages.map(msg => {
          try {
            // For producers, assume the message value is a JSON string
            const messageData = typeof msg.value === 'string' 
              ? JSON.parse(msg.value) 
              : msg.value;
            
            // Validate the message
            const validatedMessage = this.validate(
              schema, 
              messageData, 
              topic, 
              { ...options, throwOnError: options.throwOnError ?? true }
            );
            
            // Return the original message if validation passes
            return msg;
          } catch (error) {
            // If set to not throw, return a dead letter message or the original
            if (!options.throwOnError) {
              logger.warn(`Sending invalid message to dead letter queue: ${error instanceof Error ? error.message : String(error)}`);
              return msg;
            }
            
            // Otherwise, let the error propagate up
            throw error;
          }
        })
      };
    };
  }
  
  /**
   * Creates a consumer middleware for validating messages before they are processed
   *
   * @param schema The Zod schema to validate against
   * @param options Validation options
   * @returns A function that can be used to validate messages in a consumer
   */
  static consumerMiddleware<T extends z.ZodType>(
    schema: T,
    options: ValidatorOptions = {}
  ) {
    return async (message: Kafka.Message, topic: string) => {
      try {
        // For consumers, assume the message value is a buffer or string
        const messageData = message.value 
          ? (message.value instanceof Buffer 
              ? JSON.parse(message.value.toString()) 
              : typeof message.value === 'string' 
                ? JSON.parse(message.value) 
                : message.value)
          : null;
        
        if (!messageData) {
          const error = new Error('Message has no value');
          logger.error(`Empty message received for topic: ${topic}`, { topic });
          
          if (options.throwOnError ?? false) {
            throw error;
          }
          
          return null;
        }
        
        // Validate the message
        return this.validate(
          schema, 
          messageData, 
          topic, 
          { ...options, throwOnError: options.throwOnError ?? false }
        );
      } catch (error) {
        // Log the error
        logger.error(`Error processing message from topic ${topic}: ${error instanceof Error ? error.message : String(error)}`);
        
        // Re-throw if configured to do so
        if (options.throwOnError ?? false) {
          throw error;
        }
        
        return null;
      }
    };
  }
  
  /**
   * Helper method to create a validator for a specific event type
   * 
   * @param schema The Zod schema to validate against
   * @param options Validation options
   * @returns An object with middleware for both producers and consumers
   */
  static forEventType<T extends z.ZodType>(schema: T, options: ValidatorOptions = {}) {
    return {
      producer: this.producerMiddleware(schema, options),
      consumer: this.consumerMiddleware(schema, options)
    };
  }
}

export default KafkaMessageValidator;

