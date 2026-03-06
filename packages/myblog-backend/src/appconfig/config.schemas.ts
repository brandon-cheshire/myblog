import { z } from 'zod';

const ENVIRONMENT_NAMES = ['local', 'test', 'development', 'production'] as const;
const EnvironmentNameSchema = z.enum(ENVIRONMENT_NAMES);
export type EnvironmentName = z.infer<typeof EnvironmentNameSchema>;

const environmentConfigSchema = z.object({
  name: EnvironmentNameSchema,
  port: z.number(),
});

const jwtConfigSchema = z.object({
  secret: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
});
export type JwtConfig = z.infer<typeof jwtConfigSchema>;

export const appConfigSchema = z.object({
  envConfig: environmentConfigSchema,
  jwtConfig: jwtConfigSchema,
});

export type AppConfig = z.infer<typeof appConfigSchema>;

