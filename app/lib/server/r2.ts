import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET ?? "";
const publicUrl = process.env.R2_PUBLIC_URL ?? "";

// A real custom domain has been wired up only once R2_PUBLIC_URL points
// somewhere other than the placeholder. Until then we serve via the app
// (/api/assets/<key>), which works with no DNS at the cost of proxying bytes.
const hasPublicDomain = Boolean(publicUrl) && !publicUrl.includes("yourdomain.com");

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export async function putObject(key: string, body: Buffer, contentType: string) {
  await r2.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getObject(key: string) {
  return r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

/** Browser-facing URL for an object key. */
export function publicUrlFor(key: string): string {
  if (hasPublicDomain) return `${publicUrl.replace(/\/$/, "")}/${key}`;
  // App-served fallback; key segments are already URL-safe (cuid + ext).
  return `/api/assets/${key}`;
}
