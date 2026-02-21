import type { LoggingConfig } from './logging-config.type';

export function getLoggingConfig(): LoggingConfig {
  const logLevel = process.env['LOG_LEVEL'] ?? 'info';
  const appName = process.env['APP_NAME'] ?? 'backend';
  const redactRaw = process.env['LOG_REDACT'];
  const redact = redactRaw
    ? redactRaw.split(',').map((s) => s.trim())
    : ['req.headers.authorization', 'req.headers.cookie'];
  const autoLogging = process.env['LOG_AUTO_LOGGING'] !== 'false';
  const dateFormat = process.env['LOG_DATE_FORMAT'] ?? 'SYS:standard';
  const singleLine = process.env['LOG_SINGLE_LINE'] !== 'false';

  return {
    logLevel,
    appName,
    redact,
    autoLogging,
    dateFormat,
    singleLine,
  };
}
