import "dotenv/config";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

if (!/^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(supabaseKey)) {
  console.error("SUPABASE_SERVICE_ROLE_KEY no es un JWT válido.");
  process.exit(1);
}

const storage = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage;

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function ensureBucket() {
  const { data: buckets } = await storage.listBuckets();
  const exists = buckets?.some((b) => b.name === "avatars");

  if (!exists) {
    const { error } = await storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: 524_288,
    });
    if (error) {
      console.error("Error creando bucket:", error.message);
      process.exit(1);
    }
    console.log("[storage] Bucket 'avatars' creado");
  }
}

async function migrate() {
  try {
    await ensureBucket();

    const users = await prisma.profiles.findMany({
      where: {
        avatar: { startsWith: "data:" },
      },
      select: { id: true, avatar: true },
    });

    if (users.length === 0) {
      console.log("No hay avatares base64 para migrar.");
      return;
    }

    console.log(`Migrando ${users.length} avatares...`);

    for (const user of users) {
      try {
        const match = user.avatar!.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!match) {
          console.warn(`  [skip] ${user.id}: formato inválido`);
          continue;
        }

        const buffer = Buffer.from(match[2]!, "base64");
        const webpBuffer = await sharp(buffer)
          .resize(256, 256, { fit: "cover", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        const fileName = `${user.id}.webp`;

        const { error: uploadError } = await storage
          .from("avatars")
          .upload(fileName, webpBuffer, {
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) {
          console.error(`  [error] ${user.id}: upload:`, uploadError.message);
          continue;
        }

        const { data: publicUrlData } = storage
          .from("avatars")
          .getPublicUrl(fileName);

        await prisma.profiles.update({
          where: { id: user.id },
          data: { avatar: publicUrlData.publicUrl },
        });

        console.log(`  [ok] ${user.id} → ${publicUrlData.publicUrl}`);
      } catch (err) {
        console.error(`  [error] ${user.id}:`, (err as Error).message);
      }
    }

    console.log("Migración completada.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

migrate();
