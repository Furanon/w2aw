import { logger } from './logger';
import { KafkaConsumer } from './kafka';

// Import job handlers
import * as authHandler from '../jobs/authentication';
import * as marketplaceHandler from '../jobs/marketplace';
import * as aiHandler from '../jobs/ai';
import * as maintenanceHandler from '../jobs/maintenance';
import * as analyticsHandler from '../jobs/analytics';

// Define job consumer types
type JobConsumer = {
  name: string;
  topic: string;
  consumer: KafkaConsumer;
  handler: (message: any) => Promise<void>;
  isRunning: boolean;
};

// Job consumer registry
const jobConsumers: JobConsumer[] = [];

/**
 * Initializes all job consumers but doesn't start them
 */
export const initializeJobConsumers = async (): Promise<void> => {
  try {
    logger.info('Initializing job consumers');

    // Authentication job consumers
    jobConsumers.push({
      name: 'authentication',
      topic: 'auth-jobs',
      consumer: new KafkaConsumer({ topic: 'auth-jobs', groupId: 'auth-processor' }),
      handler: authHandler.processAuthJob,
      isRunning: false,
    });

    // Marketplace job consumers
    jobConsumers.push({
      name: 'marketplace',
      topic: 'marketplace-jobs',
      consumer: new KafkaConsumer({ topic: 'marketplace-jobs', groupId: 'marketplace-processor' }),
      handler: marketplaceHandler.processMarketplaceJob,
      isRunning: false,
    });

    // AI job consumers
    jobConsumers.push({
      name: 'ai',
      topic: 'ai-jobs',
      consumer: new KafkaConsumer({ topic: 'ai-jobs', groupId: 'ai-processor' }),
      handler: aiHandler.processAIJob,
      isRunning: false,
    });

    // Maintenance job consumers
    jobConsumers.push({
      name: 'maintenance',
      topic: 'maintenance-jobs',
      consumer: new KafkaConsumer({ topic: 'maintenance-jobs', groupId: 'maintenance-processor' }),
      handler: maintenanceHandler.processMaintenanceJob,
      isRunning: false,
    });

    // Analytics job consumers
    jobConsumers.push({
      name: 'analytics',
      topic: 'analytics-jobs',
      consumer: new KafkaConsumer({ topic: 'analytics-jobs', groupId: 'analytics-processor' }),
      handler: analyticsHandler.processAnalyticsJob,
      isRunning: false,
    });

    logger.info(`Initialized ${jobConsumers.length} job consumers`);
  } catch (error) {
    logger.error('Failed to initialize job consumers', { error: (error as Error).message, stack: (error as Error).stack });
    throw error;
  }
};

/**
 * Starts a specific job consumer
 */
export const startJobConsumer = async (name: string): Promise<void> => {
  const consumer = jobConsumers.find(c => c.name === name);
  
  if (!consumer) {
    throw new Error(`Job consumer '${name}' not found`);
  }

  if (consumer.isRunning) {
    logger.info(`Job consumer '${name}' is already running`);
    return;
  }

  try {
    logger.info(`Starting job consumer '${name}'`);
    
    await consumer.consumer.connect();
    
    consumer.consumer.subscribe({ 
      topic: consumer.topic,
      fromBeginning: false,
    });

    await consumer.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) {
            logger.warn(`Empty message received on topic '${topic}'`, { partition });
            return;
          }

          const parsedMessage = JSON.parse(message.value.toString());
          logger.info(`Processing job from topic '${topic}'`, {
            partition,
            offset: message.offset,
            jobType: parsedMessage.type || 'unknown',
          });

          await consumer.handler(parsedMessage);
          
          logger.info(`Successfully processed job from topic '${topic}'`, {
            partition,
            offset: message.offset,
            jobType: parsedMessage.type || 'unknown',
          });
        } catch (error) {
          logger.error(`Error processing message from topic '${topic}'`, {
            error: (error as Error).message,
            stack: (error as Error).stack,
            partition,
            offset: message.offset,
          });
          
          // Implement dead letter queue logic here if needed
          // await sendToDeadLetterQueue(topic, message);
        }
      },
    });

    consumer.isRunning = true;
    logger.info(`Job consumer '${name}' started successfully`);
  } catch (error) {
    logger.error(`Failed to start job consumer '${name}'`, { 
      error: (error as Error).message, 
      stack: (error as Error).stack 
    });
    throw error;
  }
};

/**
 * Stops a specific job consumer
 */
export const stopJobConsumer = async (name: string): Promise<void> => {
  const consumer = jobConsumers.find(c => c.name === name);
  
  if (!consumer) {
    throw new Error(`Job consumer '${name}' not found`);
  }

  if (!consumer.isRunning) {
    logger.info(`Job consumer '${name}' is not running`);
    return;
  }

  try {
    logger.info(`Stopping job consumer '${name}'`);
    await consumer.consumer.disconnect();
    consumer.isRunning = false;
    logger.info(`Job consumer '${name}' stopped successfully`);
  } catch (error) {
    logger.error(`Failed to stop job consumer '${name}'`, { 
      error: (error as Error).message, 
      stack: (error as Error).stack 
    });
    throw error;
  }
};

/**
 * Starts all job consumers
 */
export const startAllJobConsumers = async (): Promise<void> => {
  logger.info('Starting all job consumers');
  
  try {
    const startPromises = jobConsumers.map(consumer => 
      startJobConsumer(consumer.name).catch(error => {
        logger.error(`Failed to start job consumer '${consumer.name}'`, { 
          error: (error as Error).message 
        });
        return Promise.resolve(); // Continue starting other consumers even if one fails
      })
    );
    
    await Promise.all(startPromises);
    logger.info('All job consumers started');
  } catch (error) {
    logger.error('Failed to start all job consumers', { 
      error: (error as Error).message, 
      stack: (error as Error).stack 
    });
    throw error;
  }
};

/**
 * Stops all job consumers
 */
export const stopAllJobConsumers = async (): Promise<void> => {
  logger.info('Stopping all job consumers');
  
  try {
    const stopPromises = jobConsumers
      .filter(consumer => consumer.isRunning)
      .map(consumer => 
        stopJobConsumer(consumer.name).catch(error => {
          logger.error(`Failed to stop job consumer '${consumer.name}'`, { 
            error: (error as Error).message 
          });
          return Promise.resolve(); // Continue stopping other consumers even if one fails
        })
      );
    
    await Promise.all(stopPromises);
    logger.info('All job consumers stopped');
  } catch (error) {
    logger.error('Failed to stop all job consumers', { 
      error: (error as Error).message, 
      stack: (error as Error).stack 
    });
    throw error;
  }
};

/**
 * Gets the status of all job consumers
 */
export const getJobConsumersStatus = (): { name: string; isRunning: boolean }[] => {
  return jobConsumers.map(consumer => ({
    name: consumer.name,
    isRunning: consumer.isRunning,
  }));
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = async (): Promise<void> => {
  logger.info('Gracefully shutting down job consumers');
  
  try {
    await stopAllJobConsumers();
    logger.info('Job consumers gracefully shut down');
  } catch (error) {
    logger.error('Error during graceful shutdown of job consumers', { 
      error: (error as Error).message, 
      stack: (error as Error).stack 
    });
    process.exit(1);
  }
};

// Handle process signals for graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, initiating graceful shutdown');
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, initiating graceful shutdown');
  await gracefulShutdown();
  process.exit(0);
});

