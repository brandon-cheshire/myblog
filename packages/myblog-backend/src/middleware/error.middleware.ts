import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../exceptions/HttpException';
import { AppLogger } from '../common/utils/app-logger/app-logger';

const logger = new AppLogger('ErrorMiddleware');

function errorMiddleware(
  error: HttpException | Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (response.headersSent) {
    return;
  }

  if (error.message === 'STREAMING_RESPONSE_SENT') {
    return;
  }

  logger.error({ error });

  const status = error instanceof HttpException ? error.status : 500;
  const message = error.message || 'Something went wrong';
  response.status(status).send({
    status,
    message,
  });
}

export { errorMiddleware };
