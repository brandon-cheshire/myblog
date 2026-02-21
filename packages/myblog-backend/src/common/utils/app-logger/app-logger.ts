import pino from 'pino';
import { parseErrorDetails } from '../serializeError';
import type { ErrorMessageType } from './error-message.type';
import { getRootLogger } from './root-logger';
import { getRequestContext } from './request-context';

export class AppLogger {
  private readonly logger: pino.Logger;

  constructor(private readonly context?: string) {
    this.logger = getRootLogger().child({ context: this.context ?? '' });
  }

  private mergeContext(
    data?: Record<string, unknown>
  ): Record<string, unknown> {
    const store = getRequestContext();
    const base = store ? { correlationId: store.correlationId } : {};
    return data ? { ...base, ...data } : base;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(this.mergeContext(data), message);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(this.mergeContext(data), message);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(this.mergeContext(data), message);
  }

  verbose(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(this.mergeContext(data), message);
  }

  error(details: ErrorMessageType, data?: Record<string, unknown>): void {
    const { message, error } = parseErrorDetails(details, 'ERROR');
    const merged = this.mergeContext(data);
    if (error) {
      this.logger.error({ ...merged, err: error }, message);
    } else {
      this.logger.error(merged, message);
    }
  }

  fatal(details: ErrorMessageType, data?: Record<string, unknown>): void {
    const { message, error } = parseErrorDetails(details, 'FATAL');
    const merged = this.mergeContext(data);
    if (error) {
      this.logger.fatal({ ...merged, err: error }, message);
    } else {
      this.logger.fatal(merged, message);
    }
  }
}
