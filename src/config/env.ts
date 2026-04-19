import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT) || 8000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  NODE_ENV: process.env.NODE_ENV || "development",
};
