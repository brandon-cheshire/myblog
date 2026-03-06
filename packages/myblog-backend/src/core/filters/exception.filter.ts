import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { Response } from 'express';
import { HttpException } from '../../common/HttpException.js';
import { AppLogger } from '../../common/utils/app-logger/app-logger.js';

@Catch()
export class ErrorLoggingFilter implements ExceptionFilter {
  private readonly logger = new AppLogger(ErrorLoggingFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) {
      return;
    }

    if (exception instanceof Error && exception.message === 'STREAMING_RESPONSE_SENT') {
      return;
    }

    this.logger.error({ error: exception });

    if (exception instanceof HttpException) {
      response.status(exception.status).json({
        status: exception.status,
        message: exception.message,
      });
      return;
    }

    response.status(500).json({
      status: 500,
      message: 'Something went wrong',
    });
  }
}
