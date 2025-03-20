/**
 * Logger module for job processing system.
 * Supports different log levels, structured logging with JSON output,
 * and is compatible with serverless environments.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /** Minimum log level to output */
  minLevel?: LogLevel;
  /** Additional default metadata to include in all log entries */
  defaultMeta?: Record<string, any>;
  /** Whether to format logs as human-readable in development */
  prettyPrint?: boolean;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  [key: string]: any;
}

/**
 * Numeric values for log levels to determine severity
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;
  private defaultMeta: Record<string, any>;
  private prettyPrint: boolean;

  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.minLevel || 'info';
    this.defaultMeta = options.defaultMeta || {};
    this.prettyPrint = options.prettyPrint || process.env.NODE_ENV === 'development';
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, meta: Record<string, any> = {}): void {
    // Skip if log level is below minimum level
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'w2aw-jobs',
      ...this.defaultMeta,
      ...meta,
    };

    // Don't log sensitive data
    this.sanitizeLogEntry(entry);

    // Output the log
    if (this.prettyPrint) {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.service}] ${entry.message}`,
        { ...entry, timestamp: undefined, level: undefined, message: undefined, service: undefined }
      );
    } else {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(entry));
    }
  }

  /**
   * Remove or mask sensitive data from log entries
   */
  private sanitizeLogEntry(entry: LogEntry): void {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'apiKey'];
    
    Object.keys(entry).forEach(key => {
      if (typeof entry[key] === 'object' && entry[key] !== null) {
        this.sanitizeLogEntry(entry[key]);
      } else if (typeof entry[key] === 'string' && 
                sensitiveKeys.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
        entry[key] = '[REDACTED]';
      }
    });
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta: Record<string, any> = {}): void {
    this.log('debug', message, meta);
  }

  /**
   * Log an info message
   */
  info(message: string, meta: Record<string, any> = {}): void {
    this.log('info', message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta: Record<string, any> = {}): void {
    this.log('warn', message, meta);
  }

  /**
   * Log an error message
   */
  error(message: string, meta: Record<string, any> = {}): void {
    // If meta contains an Error object, extract properties
    if (meta.error instanceof Error) {
      const error = meta.error;
      meta = {
        ...meta,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error as any),
        }
      };
    }
    
    this.log('error', message, meta);
  }

  /**
   * Create a child logger with additional default metadata
   */
  child(defaultMeta: Record<string, any>): Logger {
    return new Logger({
      minLevel: this.minLevel,
      defaultMeta: { ...this.defaultMeta, ...defaultMeta },
      prettyPrint: this.prettyPrint,
    });
  }
}

/**
 * Default logger instance
 */
const defaultLogger = new Logger();

/**
 * Create a logger with custom options
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}

/**
 * Create a child logger from the default logger
 */
export function createChildLogger(meta: Record<string, any>): Logger {
  return defaultLogger.child(meta);
}

// Export default logger methods
export const debug = defaultLogger.debug.bind(defaultLogger);
export const info = defaultLogger.info.bind(defaultLogger);
export const warn = defaultLogger.warn.bind(defaultLogger);
export const error = defaultLogger.error.bind(defaultLogger);
export default defaultLogger;

