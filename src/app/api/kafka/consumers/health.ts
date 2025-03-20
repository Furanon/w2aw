import { KafkaConsumer } from '@/lib/kafka';
import { ConsumerRunConfig } from '@/lib/events/consumers/baseConsumer';

const DEGRADED_THRESHOLD = 5;
const UNHEALTHY_THRESHOLD = 10;
export interface ConsumerMetrics {
    messagesProcessed: number;
    errorCount: number;
    lastProcessedAt: Date | null;
    avgProcessingTime: number;
    consumerLag: number;
}

export interface ConsumerHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: Date;
    metrics: ConsumerMetrics;
    error?: string;
}

export class ConsumerHealthMonitor {
    private static instance: ConsumerHealthMonitor;
    private consumers: Map<string, KafkaConsumer>;
    private metrics: Map<string, ConsumerMetrics>;
    private health: Map<string, ConsumerHealth>;
    private checkInterval: NodeJS.Timeout | null;

    private constructor() {
        this.consumers = new Map();
        this.metrics = new Map();
        this.health = new Map();
        this.checkInterval = null;
    }

    public static getInstance(): ConsumerHealthMonitor {
        if (!ConsumerHealthMonitor.instance) {
            ConsumerHealthMonitor.instance = new ConsumerHealthMonitor();
        }
        return ConsumerHealthMonitor.instance;
    }

    // Reset method for testing
    public static resetInstance(): void {
        ConsumerHealthMonitor.instance = new ConsumerHealthMonitor();
    }

    public registerConsumer(consumer: KafkaConsumer, config: ConsumerRunConfig): void {
        const consumerId = `${config.groupId}-${config.topic}`;
        this.consumers.set(consumerId, consumer);
        this.metrics.set(consumerId, {
            messagesProcessed: 0,
            errorCount: 0,
            lastProcessedAt: null,
            avgProcessingTime: 0,
            consumerLag: 0
        });
        this.health.set(consumerId, {
            status: 'healthy',
            lastChecked: new Date(),
            metrics: this.metrics.get(consumerId)!
        });
    }

    public recordMessageProcessed(consumerId: string, processingTime: number): void {
        const metrics = this.metrics.get(consumerId);
        if (metrics) {
            metrics.messagesProcessed++;
            metrics.lastProcessedAt = new Date();
            metrics.avgProcessingTime = 
                (metrics.avgProcessingTime * (metrics.messagesProcessed - 1) + processingTime) / 
                metrics.messagesProcessed;
        }
    }

    public recordError(consumerId: string, error: Error): void {
        const metrics = this.metrics.get(consumerId);
        const health = this.health.get(consumerId);
        
        if (!metrics || !health) return;

        metrics.errorCount++;
        health.error = error.message;
        
        // Update status based on error count
        if (metrics.errorCount >= UNHEALTHY_THRESHOLD) {
            health.status = 'unhealthy';
        } else if (metrics.errorCount >= DEGRADED_THRESHOLD) {
            health.status = 'degraded';
        }
        
        // Update last checked time
        health.lastChecked = new Date();
    }

    private updateHealth(consumerId: string): void {
        const metrics = this.metrics.get(consumerId);
        const health = this.health.get(consumerId);
        
        if (!metrics || !health) return;

        const now = new Date();
        const timeSinceLastMessage = metrics.lastProcessedAt 
            ? now.getTime() - metrics.lastProcessedAt.getTime() 
            : 0;

        // Define health status based on metrics
        // Start with current status (preserve error-based status)
        let status = health.status;
        
        // Only update status based on time since last message if we're not already in an error state
        if (status === 'healthy') {
            if (timeSinceLastMessage > 300000) { // 5 minutes
                status = 'unhealthy';
            } else if (timeSinceLastMessage > 60000) { // 1 minute
                status = 'degraded';
            }
        }

        health.lastChecked = now;
        health.status = status;
    }

    public getHealth(consumerId?: string): ConsumerHealth | Map<string, ConsumerHealth> {
        if (consumerId) {
            return this.health.get(consumerId) || {
                status: 'unhealthy',
                lastChecked: new Date(),
                metrics: {
                    messagesProcessed: 0,
                    errorCount: 0,
                    lastProcessedAt: null,
                    avgProcessingTime: 0,
                    consumerLag: 0
                },
                error: 'Consumer not found'
            };
        }
        return this.health;
    }

    public startMonitoring(interval: number = 30000): void {
        if (this.checkInterval) return;
        
        this.checkInterval = setInterval(() => {
            for (const [consumerId] of this.consumers) {
                this.updateHealth(consumerId);
            }
        }, interval);
    }

    public stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Export the singleton instance
export const consumerHealthMonitor = ConsumerHealthMonitor.getInstance();

