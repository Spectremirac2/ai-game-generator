/**
 * Supported log levels for the structured logger.
 */
export type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Represents a structured log entry emitted by the application.
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

/**
 * Structured application logger with JSON output and monitoring hooks.
 */
class Logger {
  /**
   * Active runtime environment resolved from `NODE_ENV`.
   */
  private readonly environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV ?? "development";
  }

  /**
   * Dispatches a log entry to an external monitoring provider.
   *
   * @param entry - The structured log entry to forward.
   */
  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    try {
      // TODO: Integrate with monitoring platform (Datadog, Sentry, etc.)
      void entry;
    } catch (monitorError) {
      console.error("[logger] monitoring dispatch failed", monitorError);
    }
  }

  /**
   * Builds and emits a structured log entry at the given level.
   *
   * @param level - Desired log severity.
   * @param message - Human-readable log message.
   * @param context - Optional additional metadata.
   */
  private async log(level: LogLevel, message: string, context?: Record<string, any>): Promise<void> {
    const userIdValue = context?.userId;
    const requestIdValue = context?.requestId;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: typeof userIdValue === "string" ? userIdValue : undefined,
      requestId: typeof requestIdValue === "string" ? requestIdValue : undefined,
    };

    if (this.environment === "production") {
      await this.sendToMonitoring(entry);
    }

    console.log(JSON.stringify(entry));
  }

  /**
   * Emits an informational log entry.
   *
   * @param message - Human-readable log message.
   * @param context - Optional metadata to enrich the entry.
   */
  async info(message: string, context?: Record<string, any>): Promise<void> {
    await this.log("info", message, context);
  }

  /**
   * Emits a warning log entry.
   *
   * @param message - Human-readable log message.
   * @param context - Optional metadata to enrich the entry.
   */
  async warn(message: string, context?: Record<string, any>): Promise<void> {
    await this.log("warn", message, context);
  }

  /**
   * Emits an error log entry with optional error details.
   *
   * @param message - Human-readable log message.
   * @param error - Optional error instance or payload to include.
   * @param context - Optional metadata to enrich the entry.
   */
  async error(message: string, error?: unknown, context?: Record<string, any>): Promise<void> {
    let enrichedContext: Record<string, any> | undefined = context ? { ...context } : undefined;

    if (error instanceof Error) {
      const errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      if (enrichedContext) {
        enrichedContext.error = errorDetails;
      } else {
        enrichedContext = { error: errorDetails };
      }
    } else if (error !== undefined) {
      if (enrichedContext) {
        enrichedContext.error = error;
      } else {
        enrichedContext = { error };
      }
    }

    await this.log("error", message, enrichedContext);
  }

  /**
   * Emits a debug log entry when running in development.
   *
   * @param message - Human-readable log message.
   * @param context - Optional metadata to enrich the entry.
   */
  async debug(message: string, context?: Record<string, any>): Promise<void> {
    if (this.environment !== "development") {
      return;
    }

    await this.log("debug", message, context);
  }
}

const logger = new Logger();

export default logger;
