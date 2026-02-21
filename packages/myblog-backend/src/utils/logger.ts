/**
 * Simple logger for controller and service use.
 * Conventions: use .warn for auth failures and expected 4xx; use .error for 5xx and unexpected errors.
 * Avoid logging PII (passwords, tokens, full user objects).
 */
const log = (
  level: 'info' | 'warn' | 'error',
  name: string,
  message: string,
  meta?: Record<string, unknown>
) => {
  const prefix = `[${name}]`;
  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log;
  fn(`${prefix} ${message}${payload}`);
};

export function createLogger(name: string) {
  return {
    info(message: string, meta?: Record<string, unknown>) {
      log('info', name, message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>) {
      log('warn', name, message, meta);
    },
    error(message: string, meta?: Record<string, unknown>) {
      log('error', name, message, meta);
    },
  };
}
