# AppLogger Implementation Guide

This document describes how the **AppLogger** and logging stack work in this project so you can implement the same pattern in another NestJS project. The implementation uses **nestjs-context-logger** (which wraps **nestjs-pino** and **pino-http**) for request-scoped context (e.g. correlation ID) and a thin **AppLogger** wrapper for a consistent API and structured error handling.

---

## 1. Dependencies

Add to your backend `package.json`:

```json
{
  "dependencies": {
    "nestjs-context-logger": "^1.7.0",
    "nestjs-pino": "^4.4.0",
    "pino-http": "^10.5.0",
    "pino-pretty": "^13.0.0"
  },
  "devDependencies": {
    "pino-pretty": "^13.0.0"
  }
}
```

For error parsing we use **zod** (optional, only if you use `ZodError` in `parseErrorDetails`):

```json
"zod": "^3.x"
```

---

## 2. Log Levels

Use a string union for log levels so config and runtime can stay type-safe. You can define this in a shared package or in the backend:

```ts
// e.g. shared/constants or backend src
export const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'verbose',
] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
```

Pino/Nest use these same level names.

---

## 3. Core Types and Utilities

### 3.1 Error message type

`AppLogger.error()` and `AppLogger.fatal()` accept a flexible payload: either a message, an error, or both. Define a single type for that:

```ts
// src/common/utils/app-logger/error-message.type.ts

export type ErrorMessageType =
  | { message: string; error: unknown }
  | { message: string }
  | { error: unknown };
```

### 3.2 Error parsing (for structured logs)

These helpers turn `ErrorMessageType` into a single message string and an optional `Error` for the logger. `serializeError` is used for non-`Error` values and for a fallback message; `parseErrorDetails` supports Zod validation errors and plain `Error` instances so the implementation is identical across projects.

```ts
// src/common/utils/serializeError.ts

import { ZodError } from 'zod';
import { ErrorMessageType } from './app-logger/error-message.type';

export function serializeError(details: unknown): string {
  if (details == null) return 'Unknown Error';
  if (details instanceof Error) return details.message;
  if (
    typeof details === 'object' &&
    'message' in details &&
    typeof (details as { message: unknown }).message === 'string'
  )
    return (details as { message: string }).message;
  if (typeof details === 'object') return JSON.stringify(details);
  return String(details);
}

export function parseErrorDetails(
  details: ErrorMessageType,
  messagePrefix: string
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
  if (
    'message' in details &&
    typeof details.message === 'string' &&
    details.message
  ) {
    message = message ? details.message + ' - ' + message : details.message;
  }
  if (!message) message = 'Unknown Error';

  return {
    message: (messagePrefix ? messagePrefix + ': ' : '') + message,
    error,
  };
}
```

If you do not use Zod, remove the `ZodError` branch and the `zod` import from this file.

---

## 4. AppLogger Class

`AppLogger` wraps `ContextLogger` from `nestjs-context-logger` and adds:

- A fixed signature for **error** and **fatal** (accepting `ErrorMessageType` + optional context object).
- Use of `parseErrorDetails` so that a single message string and optional `Error` are passed to the underlying logger.

Each instance is bound to a **context** string (usually the class name) so logs can be attributed to a service/controller.

```ts
// src/common/utils/app-logger/app-logger.ts

import { ContextLogger } from 'nestjs-context-logger';
import { parseErrorDetails } from '../serializeError';
import { ErrorMessageType } from './error-message.type';

export class AppLogger {
  private readonly logger: ContextLogger;

  constructor(private readonly context?: string) {
    this.logger = new ContextLogger(this.context ?? '');
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, { data });
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, { data });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, { data });
  }

  verbose(message: string, data?: Record<string, unknown>): void {
    this.logger.verbose(message, { data });
  }

  error(details: ErrorMessageType, data?: Record<string, unknown>): void {
    const { message, error } = parseErrorDetails(details, 'ERROR');
    if (error) {
      this.logger.error(message, { error, data });
    } else {
      this.logger.error(message, data ? { data } : undefined);
    }
  }

  fatal(details: ErrorMessageType, data?: Record<string, unknown>): void {
    const { message, error } = parseErrorDetails(details, 'FATAL');
    if (error) {
      this.logger.fatal(message, { error, data });
    } else {
      this.logger.fatal(message, data ? { data } : undefined);
    }
  }
}
```

Notes:

- The underlying `ContextLogger` is request-aware when used inside an HTTP request (see registration below). Context (e.g. correlation ID) is attached automatically by the pino pipeline.
- Standard levels (`debug`, `info`, `warn`, `verbose`) take a **message** and an optional **data** object. **error** and **fatal** take **details** (`ErrorMessageType`) and optional **data** for extra context (e.g. `userId`, `transactionId`).

---

## 5. Logging Configuration and Registration

The project wires logging at app bootstrap by providing **ContextLoggerFactoryOptions** to **ContextLoggerModule**. That config drives pino-http (and pino-pretty in development).

### 5.1 Config shape

Define the logging config type once and use it in your config module and in `registerLoggingConfig`:

```ts
// src/common/utils/app-logger/logging-config.type.ts (or inline in log-registration.ts)

export interface LoggingConfig {
  logLevel: string; // use LogLevel from §2 if you have it
  appName: string;
  redact: string[];
  autoLogging: boolean;
  dateFormat: string;
  singleLine: boolean;
}
```

Example env-based defaults when building this config:

- `LOG_LEVEL` → default `'info'`
- `APP_NAME` → default `'MyApp'`
- `LOG_REDACT` → comma-separated paths to redact (e.g. `req.headers.authorization`, `res.headers`)
- `LOG_AUTO_LOGGING` → `'true'` / `'false'` for automatic request/response logging
- `LOG_DATE_FORMAT` → e.g. `'SYS:standard'` or `'ISO'`
- `LOG_SINGLE_LINE` → `'true'` / `'false'` for single-line logs

### 5.2 Registration factory (minimal, no runtime log level)

If you do **not** need runtime-changing log level (e.g. from a feature flag or admin API), pass the config level directly. Use **transport** (pino-pretty) only in development so production logs stay fast and JSON; omit or set `transport` conditionally as below.

```ts
// src/common/utils/app-logger/log-registration.ts

import { ExecutionContext } from '@nestjs/common';
import {
  ContextLogger,
  ContextLoggerFactoryOptions,
} from 'nestjs-context-logger';
import { AppLogger } from './app-logger';
import type { LoggingConfig } from './logging-config.type';

const logger = new AppLogger('RegisterLoggingConfig');

export async function registerLoggingConfig(
  loggingConfig: LoggingConfig,
  options: { environmentName?: string }
): Promise<ContextLoggerFactoryOptions> {
  const isLocal = options.environmentName === 'local';

  logger.info('Log level: ' + loggingConfig.logLevel);

  const pinoHttp: ContextLoggerFactoryOptions['pinoHttp'] = {
    name: loggingConfig.appName,
    level: loggingConfig.logLevel,
    redact: {
      paths: loggingConfig.redact,
      censor: '********',
      remove: true,
    },
    autoLogging: loggingConfig.autoLogging,
    genReqId: (request, response): string => {
      const existingId =
        (ContextLogger.getContext()['correlationId'] as string) ??
        crypto.randomUUID();
      (request as { id?: string }).id = existingId;
      response.setHeader('x-correlation-id', existingId);
      return existingId;
    },
  };

  if (isLocal) {
    pinoHttp.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        colorizeObjects: true,
        singleLine: loggingConfig.singleLine,
        translateTime: loggingConfig.dateFormat,
        ignore: 'req.headers.authorization',
      },
    };
  }

  return {
    pinoHttp,
    enrichContext: (context: ExecutionContext): Record<string, unknown> => ({
      environment: options.environmentName ?? process.env['NODE_ENV'],
      // Add any request-derived fields you want on every log, e.g.:
      // userId: context.switchToHttp().getRequest().user?.id ?? 'unknown',
    }),
  };
}
```

For an identical setup that always uses pino-pretty (e.g. all environments log to stdout in human-readable form), set `pinoHttp.transport` unconditionally using the same options block as above, with `colorize: isLocal` and `colorizeObjects: isLocal`.

### 5.3 Registration with runtime log level (optional)

If you have a service that resolves the effective log level at runtime (e.g. from DB or feature flags), inject it and use it instead of the static config level:

```ts
const runtimeLogLevel = await logLevelService.getRuntimeLogLevel();
// ...
pinoHttp: {
  level: runtimeLogLevel,
  // ... rest same as above
},
```

Then in `AppModule` you pass that service into the factory (as in this project with `LogLevelService`).

### 5.4 AppModule wiring

Import **ContextLoggerModule** with `forRootAsync` and your config factory:

```ts
// app.module.ts

import { ContextLoggerModule } from 'nestjs-context-logger';
import { registerLoggingConfig } from './common/utils/app-logger/log-registration';
import { AppConfigService } from './appconfig/appconfig.service'; // or wherever your config lives

@Module({
  imports: [
    ContextLoggerModule.forRootAsync({
      imports: [AppConfigModule], // or whatever provides logging config
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) =>
        registerLoggingConfig(appConfigService.getLoggingConfig(), {
          environmentName: appConfigService.getEnvironmentName(),
        }),
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

Adjust `AppConfigService` (or your config provider) so it exposes the logging config and environment name. If you use a runtime log-level service, add it to `imports` and `inject` and pass it to `registerLoggingConfig` as in this project.

---

## 6. Usage Conventions

### 6.1 Creating a logger

In every service, controller, or class that logs, create a **private readonly** instance with the class name as context:

```ts
import { AppLogger } from '../common/utils/app-logger/app-logger';

@Injectable()
export class UserService {
  private readonly logger = new AppLogger(UserService.name);

  async createUser(params: CreateUserParams) {
    this.logger.info('Creating new user', {
      email: params.email,
      createdBy: params.createdBy,
    });
    // ...
  }
}
```

### 6.2 What to log

- **Info**: Mutations (create, update, delete) and important business events. Include identifiers (e.g. `userId`, `tenantId`) in the second argument.
- **Warn**: Recoverable or expected-but-notable cases (e.g. user not found, validation failure before throwing).
- **Error**: Caught exceptions and failures. Use the structured `error()` API with `ErrorMessageType` and optional context.
- **Debug/verbose**: Omit in production unless needed for troubleshooting; prefer `.info` or higher for normal operations.

Do **not** log secrets (passwords, tokens, API keys). Use redaction in config for sensitive paths (e.g. `req.headers.authorization`).

### 6.3 Error logging

Use the first argument as `ErrorMessageType` and the second as optional context:

```ts
try {
  await this.someOperation();
} catch (error) {
  this.logger.error(
    { message: 'Operation failed', error },
    { userId, transactionId }
  );
  throw error;
}
```

Or message-only:

```ts
this.logger.error({ message: 'Validation failed' }, { field: 'email' });
```

Or error-only (message will be derived from `error.message`):

```ts
this.logger.error({ error });
```

### 6.4 No console.log

Use `AppLogger` only; avoid `console.log` in application code so that all output goes through the same pipeline (context, redaction, levels).

---

## 7. Optional: Global exception filter

To log every unhandled exception with AppLogger (and optionally set response status/body), use an exception filter:

```ts
// src/core/filters/exception.filter.ts

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { AppLogger } from 'src/common/utils/app-logger/app-logger';

@Catch()
export class ErrorLoggingFilter implements ExceptionFilter {
  private readonly logger = new AppLogger(ErrorLoggingFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error({ error: exception });

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
    } else {
      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }
}
```

Register it globally in `main.ts` or via `APP_FILTER` so all uncaught errors are logged consistently.

---

## 8. File layout and exports (reference)

Minimal set of files for an identical pattern in another project:

```
src/
  common/
    utils/
      app-logger/
        app-logger.ts           # export class AppLogger
        error-message.type.ts   # export type ErrorMessageType
        logging-config.type.ts # export interface LoggingConfig
        log-registration.ts     # export registerLoggingConfig (and optionally re-export LoggingConfig)
      serializeError.ts         # export serializeError, parseErrorDetails
  app.module.ts                 # ContextLoggerModule.forRootAsync(...)
  main.ts
```

**What to export and where to import from:**

| Consumer                       | Import                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Services, controllers, filters | `import { AppLogger } from './common/utils/app-logger/app-logger';`                                                     |
| Config / env → LoggingConfig   | Build an object matching `LoggingConfig` (from `logging-config.type.ts` or your config module).                         |
| AppModule                      | `import { registerLoggingConfig } from './common/utils/app-logger/log-registration';`                                   |
| log-registration.ts            | `import { AppLogger } from './app-logger';` and `import type { LoggingConfig } from './logging-config.type';`           |
| serializeError.ts              | `import { ErrorMessageType } from './app-logger/error-message.type';`                                                   |
| app-logger.ts                  | `import { parseErrorDetails } from '../serializeError';` and `import { ErrorMessageType } from './error-message.type';` |

Do not use barrel files (e.g. `index.ts`) in app-logger; import directly from the files above. Config and environment names can live in your existing config module; only the logging section needs to match the shape expected by `registerLoggingConfig`.

---

## 9. Without NestJS

The same **AppLogger API**, **types** (`ErrorMessageType`, `LoggingConfig`), and **helpers** (`serializeError`, `parseErrorDetails`) work in any Node app. Only the plumbing changes.

**Use instead of NestJS pieces:**

| NestJS                                  | Without NestJS                                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ContextLogger`                         | **pino** (root logger) and a **child logger** per class: `rootLogger.child({ context: className })`.                                                                                                                                                                                                                       |
| Request-scoped context (correlation ID) | **AsyncLocalStorage** (from `async_hooks`): in middleware, generate or read `req.id`, then `requestContext.run({ correlationId: req.id }, () => next())`. Run **pino-http** first so `req.id` is set; then a small middleware that runs the rest of the chain inside `requestContext.run(...)`.                            |
| `ContextLoggerModule.forRootAsync`      | At bootstrap: build `LoggingConfig` from env, create **pino** with that config (level, redact, and in dev a **pino-pretty** transport). Use **pino-http** as Express/Fastify middleware with the same options (redact, `genReqId`). No DI—pass the root pino into your app or set it on a module that **AppLogger** reads. |
| Nest exception filter                   | Express: `app.use((err, req, res, next) => { ... })`. Fastify: `setErrorHandler`. In the handler, log with **AppLogger** via `logger.error({ error: err })` then send status/body.                                                                                                                                         |

**AppLogger implementation (non-NestJS):** The class holds a **pino** child logger (created from the shared root). On each log call, merge the current **AsyncLocalStorage** store (e.g. `correlationId`) into the payload so every log line gets request context. Keep the same method signatures: `debug`/`info`/`warn`/`verbose(message, data?)` and `error`/`fatal(details: ErrorMessageType, data?)` using `parseErrorDetails`. No `nestjs-context-logger` dependency.

**File layout (non-NestJS):** Same types and `serializeError.ts`; replace `log-registration.ts` with a small **getLoggingConfig** (env → `LoggingConfig`) and an **initLogging** (or inline in `app.ts`) that creates the root pino and pino-http middleware. Add a **request-context** module (AsyncLocalStorage + middleware that runs with `{ correlationId: req.id }`). See the implementation in this repo’s `packages/myblog-backend` for a full example.

---

## 10. Summary

| Piece                                | Role                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **nestjs-context-logger**            | Provides `ContextLogger` and request-scoped context (e.g. correlation ID); integrates with pino.                |
| **ContextLoggerModule.forRootAsync** | Supplies pino-http options and context enrichment at bootstrap.                                                 |
| **AppLogger**                        | Thin wrapper: same API everywhere, context string per class, structured `error`/`fatal` via `ErrorMessageType`. |
| **parseErrorDetails**                | Normalizes `ErrorMessageType` to one message string and optional `Error` for the underlying logger.             |
| **registerLoggingConfig**            | Builds `ContextLoggerFactoryOptions` (level, redact, transport, genReqId, enrichContext) from your config.      |

With this, you can replicate the same logger behavior and conventions in another NestJS project without copying project-specific pieces (e.g. feature flags or user types). Omit or simplify the runtime log-level and enrichContext logic if you do not need them.
