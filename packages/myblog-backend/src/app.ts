import express from 'express';
import { errorMiddleware } from './middleware/error.middleware';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createExpressEndpoints } from '@ts-rest/express';
import { authContract, postContract, userContract } from '@myblog/shared';
import { authRouter } from './auth/auth.controller';
import { postRouter } from './posts/posts.controller';
import { userRouter } from './user/user.controller';
import { initLogging } from './common/utils/app-logger/init-logging';
import { AppLogger } from './common/utils/app-logger/app-logger';

const isLocal = process.env.NODE_ENV !== 'production';
const { pinoHttpMiddleware, requestContextMiddleware, requestLogMiddleware } = initLogging({ isLocal });

class App {
  public app: express.Application;
  public port: number;
  private readonly logger = new AppLogger(App.name);

  constructor(port: number) {
    this.app = express();
    this.port = port;
    this.connectToTheDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  public listen() {
    this.app.listen(this.port, '0.0.0.0', () => {
      this.logger.info(`App listening on port ${this.port}`);
    });
  }

  private initializeMiddlewares() {
    this.app.use(pinoHttpMiddleware);
    this.app.use(requestContextMiddleware);
    this.app.use(requestLogMiddleware);

    // Direct backend URL from frontend: CORS must allow the request origin.
    // In development, allow any origin so login/fetch work regardless of port. (Auth is Bearer, no cookies.)
    const isDev = process.env.NODE_ENV !== 'production';
    const allowedOrigin = process.env.FRONTEND_URL;
    this.app.use(cors({
      origin: allowedOrigin
        ? allowedOrigin
        : isDev
          ? true
          : (origin: string | undefined, cb: (err: null, allow: boolean | string) => void) => {
            const allow = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
            cb(null, allow ? (origin || true) : false);
          },
      credentials: isDev ? false : true,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      optionsSuccessStatus: 200,
    }));
    this.app.use(express.json());
    this.app.use(cookieParser());

    // Proxy uploads to MinIO instead of serving local files
    this.app.get('/uploads/profile-pictures/:filename', async (req, res) => {
      try {
        const { minioClient, PROFILE_PICTURES_BUCKET } = await import('./utils/minio');
        const filename = req.params.filename;

        // Get object info first to check if it exists and get content type
        const stat = await minioClient.statObject(PROFILE_PICTURES_BUCKET, filename);

        // Set content type
        res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        // Stream the object from MinIO to the response
        const stream = await minioClient.getObject(PROFILE_PICTURES_BUCKET, filename);
        stream.pipe(res);

      } catch (error) {
        this.logger.error({ message: 'Error serving file from MinIO', error });
        res.status(404).send('File not found');
      }
    });
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  private initializeRoutes() {
    // Mount the ts-rest routers using createExpressEndpoints
    // Auth and file uploads are handled inside the handlers using getAuthenticatedUser helper and multer
    // Note: createExpressEndpoints mounts routes at the root, so we need to use a router with /api prefix
    const apiRouter = express.Router();

    // Use 'combined' mode to get all validation errors
    createExpressEndpoints(authContract, authRouter, apiRouter, {
      requestValidationErrorHandler: 'combined',
    });
    createExpressEndpoints(postContract, postRouter, apiRouter, {
      requestValidationErrorHandler: 'combined',
    });
    createExpressEndpoints(userContract, userRouter, apiRouter, {
      requestValidationErrorHandler: 'combined',
    });
    this.app.use('/api', apiRouter);
  }

  private connectToTheDatabase() {
    console.log('Database connection will be established via Prisma...');
    // Prisma connects automatically when used
  }
}

export { App };
