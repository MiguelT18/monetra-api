import cors from "cors";
import UserRoutes from "./routes/user.routes.ts";
import UsersRoutes from "./routes/users.routes.ts";
import ProductRoutes from "./routes/product.routes.ts";
import AchievementRoutes from "./routes/achievement.routes.ts";
import NotificationRoutes from "./routes/notification.routes.ts";
import OrderRoutes from "./routes/order.routes.ts";
import GamificationRoutes from "./routes/gamification.routes.ts";
import AffiliationRoutes from "./routes/affiliation.routes.ts";
import EnrollmentRoutes from "./routes/enrollment.routes.ts";
import CommissionRoutes from "./routes/commission.routes.ts";
import ReviewRoutes from "./routes/review.routes.ts";
import express from "express";
import { env } from "./config/env.ts";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.middleware.ts";
import { generalLimiter } from "./middleware/rate-limit.middleware.ts";
import { supabaseAdmin } from "./lib/supabase.ts";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(cors({
  origin: env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? "*",
  credentials: true,
}));
app.use(generalLimiter);

const port = env.PORT;

app.use("/api/auth", UserRoutes);
app.use("/api/users", UsersRoutes);
app.use("/api/products", ProductRoutes);
app.use("/api/achievements", AchievementRoutes);
app.use("/api/notifications", NotificationRoutes);
app.use("/api/orders", OrderRoutes);
app.use("/api/gamification", GamificationRoutes);
app.use("/api/affiliations", AffiliationRoutes);
app.use("/api/enrollments", EnrollmentRoutes);
app.use("/api/commissions", CommissionRoutes);
app.use("/api/products/:id/reviews", ReviewRoutes);

app.use(errorMiddleware);

const BUCKETS = [
  { name: "avatars", fileSizeLimit: 524_288 },
  { name: "products", fileSizeLimit: 524_288 },
];

async function ensureBucket(bucket: { name: string; fileSizeLimit: number }) {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const existing = buckets?.find((b) => b.name === bucket.name);

  if (!existing) {
    const { error } = await supabaseAdmin.storage.createBucket(bucket.name, {
      public: true,
      fileSizeLimit: bucket.fileSizeLimit,
    });
    if (error) {
      console.error(`[bucket create error ${bucket.name}]:`, error);
    } else {
      console.log(`[storage] Bucket '${bucket.name}' created`);
    }
  } else if (!existing.public) {
    const { error } = await supabaseAdmin.storage.updateBucket(bucket.name, {
      public: true,
      fileSizeLimit: bucket.fileSizeLimit,
    });
    if (error) {
      console.error(`[bucket update error ${bucket.name}]:`, error);
    } else {
      console.log(`[storage] Bucket '${bucket.name}' updated to public`);
    }
  }
}

async function start() {
  const sk = env.SUPABASE_SERVICE_ROLE_KEY;
  const isValidJWT = sk && /^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(sk);

  if (isValidJWT) {
    try {
      await Promise.all(BUCKETS.map(ensureBucket));
    } catch (err) {
      console.error("[startup error]:", err);
    }
  } else if (sk) {
    console.warn("[storage] SUPABASE_SERVICE_ROLE_KEY no es un JWT válido. Copia el 'service_role key' de Supabase Dashboard > Settings > API (empieza con eyJ).");
  } else {
    console.warn("[storage] SUPABASE_SERVICE_ROLE_KEY no configurada, saltando setup del bucket");
  }

  app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
  });
}

start();
