import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../config/env.ts";

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  allowExitOnIdle: true,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});
