import { appConfigSchema, type AppConfig, type EnvironmentName } from './config.schemas.js';

export function getAppConfig(): AppConfig {
  const config = {
    envConfig: {
      name: (process.env.ENV_NAME as EnvironmentName | undefined) ?? 'local',
      port: parseInt(process.env.PORT ?? '3010', 10),
    },
    jwtConfig: {
      secret: process.env.JWT_SECRET ?? '',
      expiresInSeconds: (() => {
        const raw = process.env.JWT_EXPIRY_SECONDS;
        const value = raw ? Number(raw) : 60 * 60;
        return value;
      })(),
    },
  };

  const result = appConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid app config: ${result.error.message}`);
  }

  return result.data;
}

