import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT) || 8000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "http://localhost:3000",
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "",
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
  R2_BUCKET: process.env.R2_BUCKET || "monetra-videos",
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "",
};
