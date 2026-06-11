import sharp from "sharp";
import { supabaseAdmin } from "../lib/supabase.ts";

const THUMBNAIL_MAX_BYTES = 500_000;

export async function uploadBase64Image(
  image: string,
  bucket: string,
  maxDimension = 640,
): Promise<string> {
  if (!image.startsWith("data:")) {
    return image;
  }

  const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagen inválido");
  }

  const buffer = Buffer.from(match[2]!, "base64");

  if (buffer.length > THUMBNAIL_MAX_BYTES) {
    throw new Error("La imagen es demasiado grande");
  }

  const webpBuffer = await sharp(buffer)
    .resize(maxDimension, maxDimension, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const fileName = `${ts}_${rand}.webp`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    console.error(`[upload error ${bucket}]:`, uploadError);
    throw new Error("Error al subir la imagen");
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
