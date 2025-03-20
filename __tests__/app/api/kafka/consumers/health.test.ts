import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ConsumerHealthMonitor, ConsumerMetrics, ConsumerHealth } from '@/app/api/kafka/consumers/health';
import { GET } from '@/app/api/kafka/consumers/route';
import { KafkaConsumer } from '@lib/kafka';

// Mock KafkaConsumer
vi.mock('@lib/kafka', () => ({
    KafkaConsumer: vi.fn().mockImplementation(() => ({
        connect: vi.fn(),
        subscribe: vi.fn(),
        run: vi.fn(),
        disconnect: vi.fn(),
    })),
}));

describe('ConsumerHealthMonitor', () => {
    let healthMonitor: ConsumerHealthMonitor;
    let mockConsumer: KafkaConsumer;
    const mockConfig = {
        topic: 'test-topic',
        groupId: 'test-group',
    };
    const consumerId = `${mockConfig.groupId}-${mockConfig.topic}`;

    beforeEach(() => {
        vi.clearAllMocks();
        healthMonitor = new ConsumerHealthMonitor();
        mockConsumer = new KafkaConsumer();
    });

    test('registers consumer successfully', () => {
        healthMonitor.registerConsumer(mockConsumer, mockConfig);
        const health = healthMonitor.getHealth(consumerId) as ConsumerHealth;
        
        expect(health).toBeDefined();
        expect(health.status).toBe('healthy');
        expect(health.metrics.messagesProcessed).toBe(0);
        expect(health.metrics.errorCount).toBe(0);
    });

    test('records message processing metrics', () => {
        healthMonitor.registerConsumer(mockConsumer, mockConfig);
        
        healthMonitor.recordMessageProcessed(consumerId, 100); // 100ms processing time
        
        const health = healthMonitor.getHealth(consumerId) as ConsumerHealth;
        expect(health.metrics.messagesProcessed).toBe(1);
        expect(health.metrics.avgProcessingTime).toBe(100);
        expect(health.metrics.lastProcessedAt).toBeDefined();
    });

    test('records errors and updates health status', () => {
        healthMonitor.registerConsumer(mockConsumer, mockConfig);
        
        // Simulate multiple errors
        for (let i = 0; i < 6; i++) {
            healthMonitor.recordError(consumerId, new Error('Test error'));
        }
        
        const health = healthMonitor.getHealth(consumerId) as ConsumerHealth;
        expect(health.status).toBe('degraded');
        expect(health.metrics.errorCount).toBe(6);
        expect(health.error).toBe('Test error');
    });

    test('transitions to unhealthy state after many errors', () => {
        healthMonitor.registerConsumer(mockConsumer, mockConfig);
        
        // Simulate multiple errors
        for (let i = 0; i < 11; i++) {
            healthMonitor.recordError(consumerId, new Error('Test error'));
        }
        
        const health = healthMonitor.getHealth(consumerId) as ConsumerHealth;
        expect(health.status).toBe('unhealthy');
        expect(health.metrics.errorCount).toBe(11);
    });

    test('starts and stops monitoring successfully', async () => {
        vi.useFakeTimers();
        healthMonitor.registerConsumer(mockConsumer, mockConfig);
        
        healthMonitor.startMonitoring(1000); // 1 second interval
        
        // Fast-forward time
        vi.advanceTimersByTime(5000);
        
        healthMonitor.stopMonitoring();
        vi.useRealTimers();
    });
});

describe('Consumer Health API', () => {
    let healthMonitor: ConsumerHealthMonitor;

    beforeEach(() => {
        vi.clearAllMocks();
        healthMonitor = ConsumerHealthMonitor.getInstance();
        // Reset the monitor's state
        healthMonitor['health'] = new Map();
        healthMonitor['metrics'] = new Map();
    });

    test('GET returns all consumer health data', async () => {
        const request = new Request('http://localhost/api/kafka/consumers');
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toBeDefined();
    });

    test('GET with consumerId returns specific consumer health', async () => {
        // Register a test consumer first
        const mockConsumer = new KafkaConsumer();
        const mockConfig = {
            topic: 'test-topic',
            groupId: 'test-group',
        };
        healthMonitor.registerConsumer(mockConsumer, mockConfig);
        
        const request = new Request('http://localhost/api/kafka/consumers?consumerId=test-group-test-topic');
        const response = await GET(request);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data).toBeDefined();
    });

    test('GET with invalid consumerId returns 404', async () => {
        const request = new Request('http://localhost/api/kafka/consumers?consumerId=invalid-id');
        const response = await GET(request);
        
        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('Consumer not found');
    });
});

