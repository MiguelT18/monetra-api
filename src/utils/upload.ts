import sharp from "sharp";
import { uploadFile, getPublicUrl, hasR2Credentials } from "../lib/r2.ts";
import { HttpError } from "../errors/http-error.ts";

const THUMBNAIL_MAX_BYTES = 500_000;

export async function uploadBase64Image(
  image: string,
  maxDimension = 640,
): Promise<string> {
  if (!image.startsWith("data:")) {
    return image;
  }

  if (!hasR2Credentials) {
    throw new HttpError(500, "R2 no está configurado");
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
  const key = `products/${fileName}`;

  await uploadFile(key, webpBuffer, "image/webp");

  return getPublicUrl(key);
}
