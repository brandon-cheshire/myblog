import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { setRootLogger } from './root-logger';
import { requestContextMiddleware } from './request-context';
import { getLoggingConfig } from './get-logging-config';
import type { LoggingConfig } from './logging-config.type';

function createPino(config: LoggingConfig, isLocal: boolean): pino.Logger {
  const options: pino.LoggerOptions = {
    name: config.appName,
    level: config.logLevel,
    redact: {
      paths: config.redact,
      censor: '********',
      remove: true,
    },
  };

  if (isLocal) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        colorizeObjects: true,
        singleLine: config.singleLine,
        translateTime: config.dateFormat,
        ignore: 'req.headers.authorization',
      },
    };
  }

  return pino(options);
}

function createPinoHttpMiddleware(logger: pino.Logger) {
  return pinoHttp({
    logger,
    autoLogging: false,
    genReqId: (req, res) => {
      const id = (req as { id?: string }).id ?? crypto.randomUUID();
      (req as { id?: string }).id = id;
      res.setHeader('x-correlation-id', id);
      return id;
    },
  });
}

function createRequestLogMiddleware(
  logger: pino.Logger,
  enabled: boolean
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) {
      next();
      return;
    }
    const start = Date.now();
    res.on('finish', () => {
      const reqId = (req as Request & { id?: string }).id;
      const method = req.method;
      const url = req.url;
      const statusCode = res.statusCode;
      const responseTime = Date.now() - start;
      logger.info(
        { reqId, method, url, statusCode, responseTime },
        `${method} ${url} ${statusCode}`
      );
    });
    next();
  };
}

export function initLogging(options: { isLocal?: boolean } = {}): {
  pinoHttpMiddleware: ReturnType<typeof createPinoHttpMiddleware>;
  requestContextMiddleware: typeof requestContextMiddleware;
  requestLogMiddleware: ReturnType<typeof createRequestLogMiddleware>;
} {
  const config = getLoggingConfig();
  const isLocal = options.isLocal ?? process.env['NODE_ENV'] !== 'production';
  const root = createPino(config, isLocal);
  setRootLogger(root);

  const pinoHttpMiddleware = createPinoHttpMiddleware(root);
  const requestLogMiddleware = createRequestLogMiddleware(
    root,
    config.autoLogging
  );

  return {
    pinoHttpMiddleware,
    requestContextMiddleware,
    requestLogMiddleware,
  };
}
