import cors from "cors";
import UserRoutes from "./routes/user.routes.ts";
import UsersRoutes from "./routes/users.routes.ts";
import ProductRoutes from "./routes/product.routes.ts";
import AchievementRoutes from "./routes/achievement.routes.ts";
import NotificationRoutes from "./routes/notification.routes.ts";
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

app.use(errorMiddleware);

async function ensureAvatarBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const existing = buckets?.find((b) => b.name === "avatars");

  if (!existing) {
    const { error } = await supabaseAdmin.storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: 524_288,
    });
    if (error) {
      console.error("[bucket create error]:", error);
    } else {
      console.log("[storage] Bucket 'avatars' created");
    }
  } else if (!existing.public) {
    const { error } = await supabaseAdmin.storage.updateBucket("avatars", {
      public: true,
      fileSizeLimit: 524_288,
    });
    if (error) {
      console.error("[bucket update error]:", error);
    } else {
      console.log("[storage] Bucket 'avatars' updated to public");
    }
  }
}

async function start() {
  const sk = env.SUPABASE_SERVICE_ROLE_KEY;
  const isValidJWT = sk && /^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(sk);

  if (isValidJWT) {
    try {
      await ensureAvatarBucket();
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
