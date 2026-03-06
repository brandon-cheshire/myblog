import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { initLogging } from './common/utils/app-logger/init-logging.js';
import { AppLogger } from './common/utils/app-logger/app-logger.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { validateEnv } from './utils/validateEnv.js';
import { ErrorLoggingFilter } from './core/filters/exception.filter.js';

const logger = new AppLogger('App');

export class App {
  constructor(public expressApp: express.Application) {
    this.expressApp = expressApp;
  }

  static async create(): Promise<App> {
    validateEnv();

    const isLocal = process.env.NODE_ENV !== 'production';
    const {
      pinoHttpMiddleware,
      requestContextMiddleware,
      requestLogMiddleware,
    } = initLogging({ isLocal });

    const expressApp = express();

    expressApp.use(pinoHttpMiddleware);
    expressApp.use(requestContextMiddleware);
    expressApp.use(requestLogMiddleware);

    const allowedOrigin = process.env.FRONTEND_URL;
    expressApp.use(
      cors({
        origin: allowedOrigin
          ? allowedOrigin
          : isLocal
            ? true
            : (
                origin: string | undefined,
                cb: (err: null, allow: boolean | string) => void
              ) => {
                const allow =
                  !origin ||
                  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
                cb(null, allow ? origin || true : false);
              },
        credentials: isLocal ? false : true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        optionsSuccessStatus: 200,
      })
    );
    expressApp.use(express.json());
    expressApp.use(cookieParser());

    expressApp.get(
      '/uploads/profile-pictures/:filename',
      async (req: express.Request, res: express.Response) => {
        try {
          const { minioClient, PROFILE_PICTURES_BUCKET } =
            await import('./utils/minio.js');
          const filename = req.params.filename;
          const stat = await minioClient.statObject(
            PROFILE_PICTURES_BUCKET,
            filename
          );
          res.setHeader(
            'Content-Type',
            stat.metaData['content-type'] || 'application/octet-stream'
          );
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          const stream = await minioClient.getObject(
            PROFILE_PICTURES_BUCKET,
            filename
          );
          stream.pipe(res);
        } catch (error) {
          logger.error({ message: 'Error serving file from MinIO', error });
          res.status(404).send('File not found');
        }
      }
    );

    const { AppModule } = await import('./app.module.js');
    const nestApp = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(expressApp),
      { bufferLogs: true }
    );

    nestApp.setGlobalPrefix('api');
    nestApp.useGlobalFilters(new ErrorLoggingFilter());
    nestApp.getHttpAdapter().getInstance().disable('x-powered-by');

    expressApp.use(errorMiddleware);

    await nestApp.init();

    const port = parseInt(process.env.PORT || '5000');
    await nestApp.listen(port, '0.0.0.0');

    logger.info(`App listening on port ${port}`);

    return new App(expressApp);
  }
}
