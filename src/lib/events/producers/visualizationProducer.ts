import { z } from 'zod';
import { BaseProducer, BaseProducerConfig } from './baseProducer';
import { KAFKA_TOPICS } from '../../config/kafka';
import { EventType } from '../schemas/baseEvent';
import { 
  VisualizationData, 
  VisualizationNode, 
  VisualizationConnection 
} from '../../../types/visualization';

/**
 * Payload for visualization events
 */
export interface VisualizationEventPayload {
  id: string;
  timestamp: string;
  type: EventType;
  version: string;
  correlationId?: string;
  source?: string;
  data: {
    userId: string;
    visualizationId: string;
    visualizationData: VisualizationData;
    metadata?: Record<string, any>;
  };
}

/**
 * Producer for visualization events
 * Handles validation and production of visualization-related messages to Kafka
 */
export class VisualizationProducer extends BaseProducer<VisualizationEventPayload> {
  /**
   * Creates a new VisualizationProducer
   * 
   * @param config Optional producer configuration options
   */
  constructor(config?: Partial<BaseProducerConfig>) {
    super({
      topic: KAFKA_TOPICS.VISUALIZATION_UPDATES,
      dlqTopic: KAFKA_TOPICS.VISUALIZATION_DLQ,
      ...config
    });
  }

  /**
   * Returns the Zod validation schema for visualization events
   */
  protected getValidationSchema(): z.ZodType<VisualizationEventPayload> {
    // Define nested schemas for the visualization data structure
    const locationSchema = z.object({
      lat: z.number(),
      lng: z.number()
    });

    const visualizationNodeSchema: z.ZodType<VisualizationNode> = z.object({
      id: z.string(),
      name: z.string(),
      position: z.tuple([z.number(), z.number(), z.number()]),
      rating: z.number().min(0).max(5),
      type: z.string()
    });

    const visualizationConnectionSchema: z.ZodType<VisualizationConnection> = z.object({
      source: z.string(),
      target: z.string()
    });

    const visualizationDataSchema: z.ZodType<VisualizationData> = z.object({
      nodes: z.array(visualizationNodeSchema),
      connections: z.array(visualizationConnectionSchema)
    });

    // Define the main event payload schema
    return z.object({
      id: z.string().uuid(),
      timestamp: z.string().datetime({ offset: true }),
      type: z.enum([
        EventType.VISUALIZATION_CREATED,
        EventType.VISUALIZATION_UPDATED,
        EventType.VISUALIZATION_DELETED
      ]),
      version: z.string(),
      correlationId: z.string().optional(),
      source: z.string().optional(),
      data: z.object({
        userId: z.string().uuid(),
        visualizationId: z.string().uuid(),
        visualizationData: visualizationDataSchema,
        metadata: z.record(z.any()).optional()
      })
    });
  }

  /**
   * Creates a new visualization event
   * 
   * @param userId User who created the visualization
   * @param visualizationData The visualization data
   * @param metadata Optional additional metadata
   * @returns Promise resolving when the message is sent
   */
  public async createVisualization(
    userId: string,
    visualizationData: VisualizationData,
    metadata?: Record<string, any>
  ): Promise<void> {
    const visualizationId = crypto.randomUUID();
    
    await this.produce({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: EventType.VISUALIZATION_CREATED,
      version: '1.0',
      data: {
        userId,
        visualizationId,
        visualizationData,
        metadata
      }
    }, visualizationId);
  }

  /**
   * Updates an existing visualization
   * 
   * @param userId User who is updating the visualization
   * @param visualizationId ID of the visualization to update
   * @param visualizationData The updated visualization data
   * @param metadata Optional additional metadata
   * @returns Promise resolving when the message is sent
   */
  public async updateVisualization(
    userId: string,
    visualizationId: string,
    visualizationData: VisualizationData,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.produce({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: EventType.VISUALIZATION_UPDATED,
      version: '1.0',
      data: {
        userId,
        visualizationId,
        visualizationData,
        metadata
      }
    }, visualizationId);
  }

  /**
   * Deletes a visualization
   * 
   * @param userId User who is deleting the visualization
   * @param visualizationId ID of the visualization to delete
   * @param metadata Optional additional metadata
   * @returns Promise resolving when the message is sent
   */
  public async deleteVisualization(
    userId: string,
    visualizationId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.produce({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: EventType.VISUALIZATION_DELETED,
      version: '1.0',
      data: {
        userId,
        visualizationId,
        visualizationData: { nodes: [], connections: [] },
        metadata
      }
    }, visualizationId);
  }

  /**
   * Batch updates multiple visualizations at once
   * 
   * @param updates Array of visualization updates
   * @returns Promise resolving when all messages are sent
   */
  public async batchUpdateVisualizations(
    updates: Array<{
      userId: string;
      visualizationId: string;
      visualizationData: VisualizationData;
      metadata?: Record<string, any>;
    }>
  ): Promise<void> {
    const payloads = updates.map(update => ({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: EventType.VISUALIZATION_UPDATED,
      version: '1.0',
      data: {
        userId: update.userId,
        visualizationId: update.visualizationId,
        visualizationData: update.visualizationData,
        metadata: update.metadata
      }
    }));

    const keys = updates.map(update => update.visualizationId);
    
    await this.produceBatch(payloads, keys);
  }
}

