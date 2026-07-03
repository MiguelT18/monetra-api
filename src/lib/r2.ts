import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.ts";

const hasR2Credentials = env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY;

let r2Client: S3Client | null = null;

if (hasR2Credentials) {
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  console.log("[r2] Client initialized");
} else {
  console.warn("[r2] R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY not set — R2 disabled");
}

const BUCKET = env.R2_BUCKET;

function getPublicUrl(key: string): string {
  if (env.R2_PUBLIC_URL) {
    const base = env.R2_PUBLIC_URL.replace(/\/+$/, "");
    return `${base}/${key}`;
  }
  return `https://${BUCKET}.${env.R2_ACCOUNT_ID}.r2.dev/${key}`;
}

async function generatePresignedUploadUrl(key: string, contentType: string): Promise<string> {
  if (!r2Client) throw new Error("R2 no está configurado");

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

async function uploadFile(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
  if (!r2Client) throw new Error("R2 no está configurado");

  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

async function uploadHLSFiles(jobId: string, sourceDir: string): Promise<void> {
  if (!r2Client) throw new Error("R2 no está configurado");

  const fs = await import("node:fs");
  const path = await import("node:path");

  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) continue;

    const contentType = file.endsWith(".ts") ? "video/MP2T" : "application/vnd.apple.mpegurl";
    const key = `hls/${jobId}/${file}`;

    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fs.readFileSync(filePath),
      ContentType: contentType,
    }));
  }
}

export { r2Client, hasR2Credentials, BUCKET, getPublicUrl, generatePresignedUploadUrl, uploadFile, uploadHLSFiles };
