import { z } from 'zod';
import { HttpException } from '../common/HttpException';
import type { AppLogger } from '../common/utils/app-logger/app-logger';

/** Standard error body shape for ts-rest responses (matches contract). */
export type ErrorBody = { error: string };

/** Validation error body with optional details (matches contract). */
export type ValidationErrorBody = {
  error: string;
  details?: Array<{ field: string; message: string }>;
};

/**
 * Return a ts-rest error response with standard { error } body.
 * Use for 4xx/5xx that are not validation errors.
 */
export function errorResponse<S extends 400 | 401 | 403 | 404 | 409 | 500>(
  status: S,
  message: string
): { status: S; body: ErrorBody } {
  return { status, body: { error: message } };
}

/**
 * Return a ts-rest 400 validation error response with optional details.
 */
export function validationErrorResponse(
  message: string,
  details?: Array<{ field: string; message: string }>
): { status: 400; body: ValidationErrorBody } {
  return {
    status: 400 as const,
    body: details ? { error: message, details } : { error: message },
  };
}

/**
 * Map a ZodError to the standard validation response shape.
 */
export function zodErrorResponse(
  error: z.ZodError,
  defaultMessage = 'Validation failed'
): { status: 400; body: ValidationErrorBody } {
  return validationErrorResponse(
    defaultMessage,
    error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
  );
}

/**
 * Handle an error thrown in a controller and return a ts-rest response.
 * - HttpException → status + error message (no log for 4xx; log for 5xx).
 * - ZodError → 400 with validation details (use validationMessage to match contract).
 * - Otherwise → log and return 500 with generic message (no stack/PII in body).
 */
export function handleControllerError(
  error: unknown,
  options?: { logger?: AppLogger; context?: string; validationMessage?: string }
): {
  status: 400 | 401 | 403 | 404 | 409 | 500;
  body: ErrorBody | ValidationErrorBody;
} {
  const {
    logger,
    context = 'handler',
    validationMessage = 'Validation failed',
  } = options ?? {};

  if (error instanceof HttpException) {
    if (logger && error.status >= 500) {
      logger.error(
        { message: `${context}: ${error.message}`, error },
        { status: error.status }
      );
    }
    return errorResponse(
      error.status as 400 | 401 | 403 | 404 | 409 | 500,
      error.message
    );
  }

  if (error instanceof z.ZodError) {
    return zodErrorResponse(error, validationMessage);
  }

  if (logger) {
    logger.error({ message: context, error });
  }
  return errorResponse(500, 'Something went wrong');
}
