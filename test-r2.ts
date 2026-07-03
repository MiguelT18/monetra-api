import { env } from "./src/config/env.ts";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function test() {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: "test-connection.txt",
    ContentType: "text/plain",
  });

  try {
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    console.log("SUCCESS:", url);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();
