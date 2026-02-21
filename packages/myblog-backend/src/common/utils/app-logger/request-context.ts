import { AsyncLocalStorage } from 'async_hooks';
import type { Request, Response, NextFunction } from 'express';

export interface RequestContextStore {
  correlationId: string;
}

const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore | undefined {
  return requestContext.getStore();
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId =
    (req as Request & { id?: string }).id ?? crypto.randomUUID();
  requestContext.run({ correlationId }, () => next());
}
