import { ZodError } from 'zod';
import type { ErrorMessageType } from './app-logger/error-message.type';

export function serializeError(details: unknown): string {
  if (details == null) {
    return 'Unknown Error';
  }
  if (details instanceof Error) {
    return details.message;
  }
  if (
    typeof details === 'object' &&
    'message' in details &&
    typeof (details as { message: unknown }).message === 'string'
  ) {
    return (details as { message: string }).message;
  }
  if (typeof details === 'object') {
    return JSON.stringify(details);
  }
  return String(details);
}

export function parseErrorDetails(
  details: ErrorMessageType,
  messagePrefix: string,
): { message: string; error: Error | undefined } {
  let message = '';
  let error: Error | undefined;

  if ('error' in details && details.error != null) {
    if (details.error instanceof Error) {
      error = details.error;
      if (details.error instanceof ZodError) {
        message = details.error.errors.map((e) => e.message).join(', ');
      } else {
        message = error.message;
      }
    } else {
      message = serializeError(details.error);
    }
  }
  if ('message' in details && typeof details.message === 'string' && details.message) {
    message = message ? details.message + ' - ' + message : details.message;
  }
  if (!message) {
    message = 'Unknown Error';
  }

  return {
    message: (messagePrefix ? messagePrefix + ': ' : '') + message,
    error,
  };
}
