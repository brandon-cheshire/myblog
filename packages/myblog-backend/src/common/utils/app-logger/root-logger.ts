import pino from 'pino';

let rootLogger: pino.Logger | null = null;

export function setRootLogger(logger: pino.Logger): void {
  rootLogger = logger;
}

export function getRootLogger(): pino.Logger {
  if (!rootLogger) {
    throw new Error(
      'Logging not initialized: setRootLogger() must be called before creating AppLogger'
    );
  }
  return rootLogger;
}
