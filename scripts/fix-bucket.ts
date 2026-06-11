import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const storage = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage;

async function fix() {
  const { data: buckets } = await storage.listBuckets();
  const bucket = buckets?.find((b) => b.name === "avatars");

  if (!bucket) {
    console.log("Creando bucket 'avatars' como público...");
    const { error } = await storage.createBucket("avatars", {
      public: true,
      fileSizeLimit: 524_288,
    });
    if (error) {
      console.error("Error creando bucket:", error.message);
      process.exit(1);
    }
  } else if (!bucket.public) {
    console.log("Actualizando bucket 'avatars' a público...");
    const { error } = await storage.updateBucket("avatars", {
      public: true,
      fileSizeLimit: 524_288,
    });
    if (error) {
      console.error("Error actualizando bucket:", error.message);
      process.exit(1);
    }
  } else {
    console.log("Bucket 'avatars' ya es público.");
  }

  const { data: objects, error: listError } = await storage.from("avatars").list();
  if (listError) {
    console.error("Error listando objetos:", listError.message);
  } else {
    console.log(`Archivos en bucket: ${objects?.length ?? 0}`);
    for (const obj of objects ?? []) {
      const { data: pub } = storage.from("avatars").getPublicUrl(obj.name);
      console.log(`  ${obj.name} → ${pub.publicUrl}`);
    }
  }
}

fix();
