export const KAFKA_TOPICS = {
        // Notification topics
        NOTIFICATIONS: "notifications",
        NOTIFICATION_RESULTS: "notification-results",
        NOTIFICATION_ERRORS: "notification-errors",
        
        // AI topics
        AI_JOBS: "ai-jobs",
        AI_RESULTS: "ai-results",
        AI_DLQ: "ai-dlq",
        
        // Maintenance topics
        MAINTENANCE_JOBS: "maintenance-jobs",
        MAINTENANCE_RESULTS: "maintenance-results",
        MAINTENANCE_DLQ: "maintenance-dlq",
        
        // Marketplace topics
        MARKETPLACE_JOBS: "marketplace-jobs",
        MARKETPLACE_RESULTS: "marketplace-results",
        MARKETPLACE_DLQ: "marketplace-dlq",
        
        // Auth topics
        AUTH_JOBS: "auth-jobs",
        AUTH_RESULTS: "auth-results",
        AUTH_DLQ: "auth-dlq",
        
        // Analytics topics
        ANALYTICS_JOBS: "analytics-jobs",
        ANALYTICS_RESULTS: "analytics-results",
        ANALYTICS_DLQ: "analytics-dlq",
        
        // Visualization topics (new)
        VISUALIZATION_UPDATES: "visualization-updates",
        VISUALIZATION_RESULTS: "visualization-results",
        VISUALIZATION_DLQ: "visualization-dlq",
        
        // Places topics (new)
        PLACES_JOBS: "places-jobs",
        PLACES_RESULTS: "places-results",
        PLACES_DLQ: "places-dlq"
      } as const;

      export type KafkaTopics = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];

      export const KAFKA_CONFIG = {
        CLIENT_ID: process.env.KAFKA_CLIENT_ID || "w2aw-client",
        GROUP_ID: process.env.KAFKA_GROUP_ID || "w2aw-group",
        BROKERS: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
        SSL: process.env.KAFKA_SSL === "true",
        SASL: process.env.KAFKA_SASL_ENABLED === "true" ? {
          mechanism: process.env.KAFKA_SASL_MECHANISM || "plain",
          username: process.env.KAFKA_SASL_USERNAME || "",
          password: process.env.KAFKA_SASL_PASSWORD || "",
        } : undefined,
        // Validation middleware configuration
        VALIDATION: {
          ENABLED: process.env.KAFKA_VALIDATION_ENABLED !== "false", // Enable by default
          STRICT_MODE: process.env.KAFKA_VALIDATION_STRICT === "true", // When true, invalid messages are rejected
          LOG_ERRORS: process.env.KAFKA_VALIDATION_LOG_ERRORS !== "false", // Log validation errors by default
        },
        // Retry configuration
        RETRY: {
          ENABLED: process.env.KAFKA_RETRY_ENABLED !== "false", // Enable by default
          MAX_RETRIES: parseInt(process.env.KAFKA_MAX_RETRIES || "3", 10),
          INITIAL_RETRY_TIME: parseInt(process.env.KAFKA_INITIAL_RETRY_TIME || "100", 10), // ms
          RETRY_FACTOR: parseFloat(process.env.KAFKA_RETRY_FACTOR || "2.0"), // Exponential backoff factor
          MAX_RETRY_TIME: parseInt(process.env.KAFKA_MAX_RETRY_TIME || "30000", 10), // 30 seconds
        },
      };

      export const KAFKA_CONSUMER_GROUPS = {
        NOTIFICATIONS: "notification-processor",
        AI: "ai-processor",
        MAINTENANCE: "maintenance-processor",
        MARKETPLACE: "marketplace-processor",
        AUTH: "auth-processor",
        ANALYTICS: "analytics-processor",
        VISUALIZATION: "visualization-processor",
        PLACES: "places-processor",
        // Error handling consumer groups
        DLQ_PROCESSOR: "dlq-processor",
      } as const;

      // Consumer configuration by group
      export const CONSUMER_GROUP_CONFIG = {
        // Default configuration that applies to all consumer groups unless overridden
        DEFAULT: {
          SESSION_TIMEOUT: parseInt(process.env.KAFKA_SESSION_TIMEOUT || "30000", 10), // 30 seconds
          HEARTBEAT_INTERVAL: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL || "3000", 10), // 3 seconds
          REBALANCE_TIMEOUT: parseInt(process.env.KAFKA_REBALANCE_TIMEOUT || "60000", 10), // 1 minute
          MAX_BYTES: parseInt(process.env.KAFKA_MAX_BYTES || "1048576", 10), // 1MB
          MAX_WAIT_TIME_MS: parseInt(process.env.KAFKA_MAX_WAIT_TIME || "5000", 10), // 5 seconds
          ALLOW_AUTO_TOPIC_CREATION: process.env.KAFKA_AUTO_TOPIC_CREATION === "true",
          AUTO_COMMIT: process.env.KAFKA_AUTO_COMMIT !== "false", // Enable auto-commit by default
          AUTO_COMMIT_INTERVAL: parseInt(process.env.KAFKA_AUTO_COMMIT_INTERVAL || "5000", 10), // 5 seconds
          AUTO_COMMIT_THRESHOLD: parseInt(process.env.KAFKA_AUTO_COMMIT_THRESHOLD || "100", 10), // Commit after 100 messages
          ISOLATION_LEVEL: parseInt(process.env.KAFKA_ISOLATION_LEVEL || "1", 10), // Read committed (1) by default
        },
        // Override specific settings for certain consumer groups
        NOTIFICATIONS: {
          MAX_WAIT_TIME_MS: 2000, // Faster processing for notifications
        },
        AI: {
          MAX_BYTES: 5242880, // 5MB for potentially larger AI payloads
        },
        DLQ_PROCESSOR: {
          AUTO_COMMIT: false, // Manual commit for DLQ processing
          MAX_BYTES: 10485760, // 10MB for error analysis
          ISOLATION_LEVEL: 0, // Read uncommitted (0) to ensure all errors are processed
        },
      };
