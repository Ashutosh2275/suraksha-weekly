import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("8080"),
  APP_NAME: z.string().default("suraksha-api"),
  API_VERSION: z.string().default("v1"),
  INTERNAL_API_KEY: z.string().default("dev-internal-key"),
  ACCESS_TOKEN_TTL_MINUTES: z.string().default("30"),
  REFRESH_TOKEN_TTL_HOURS: z.string().default("24"),
  ADMIN_EMAIL: z.string().default("ops@suraksha.dev"),
  ADMIN_PASSWORD: z.string().default("Admin@123"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  PAYMENT_PROVIDER: z.string().default("sandbox"),
  WEATHER_API_KEY: z.string().optional(),
  AQI_API_KEY: z.string().optional()
});

const parsed = ConfigSchema.parse(process.env);

export const config = {
  nodeEnv: parsed.NODE_ENV,
  port: Number(parsed.PORT),
  appName: parsed.APP_NAME,
  apiVersion: parsed.API_VERSION,
  internalApiKey: parsed.INTERNAL_API_KEY,
  accessTokenTtlMinutes: Number(parsed.ACCESS_TOKEN_TTL_MINUTES),
  refreshTokenTtlHours: Number(parsed.REFRESH_TOKEN_TTL_HOURS),
  adminEmail: parsed.ADMIN_EMAIL,
  adminPassword: parsed.ADMIN_PASSWORD,
  databaseUrl: parsed.DATABASE_URL,
  redisUrl: parsed.REDIS_URL,
  paymentProvider: parsed.PAYMENT_PROVIDER,
  weatherApiKey: parsed.WEATHER_API_KEY,
  aqiApiKey: parsed.AQI_API_KEY
};
