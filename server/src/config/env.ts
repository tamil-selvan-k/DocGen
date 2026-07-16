import dotenv from 'dotenv';
import { z } from 'zod';

// Load variables from .env
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters long"),
  JWT_REFRESH_SECRET: z.string().min(8).default('refresh-secret-change-me-in-prod'),
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  GITHUB_APP_ID: z.string().min(1, "GITHUB_APP_ID is required"),
  GITHUB_PRIVATE_KEY: z.string().min(1, "GITHUB_PRIVATE_KEY (Base64-encoded PEM) is required"),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@autodocs.ai'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment configuration:");
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
};

export const config = parseEnv();

/**
 * Returns the decoded GITHUB_PRIVATE_KEY.
 * The environment variable is expected to be a Base64-encoded PEM private key.
 */
export const getGitHubPrivateKey = (): string => {
  try {
    const decoded = Buffer.from(config.GITHUB_PRIVATE_KEY, 'base64').toString('utf8');
    if (!decoded.includes('-----BEGIN PRIVATE KEY-----') && !decoded.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      throw new Error("Decoded string does not contain a valid private key header.");
    }
    return decoded;
  } catch (error) {
    // Fallback to raw if decoding fails or doesn't have PEM header
    return config.GITHUB_PRIVATE_KEY;
  }
};
