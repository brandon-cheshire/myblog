export interface LoggingConfig {
  logLevel: string;
  appName: string;
  redact: string[];
  autoLogging: boolean;
  dateFormat: string;
  singleLine: boolean;
}
