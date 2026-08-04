import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
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

/**
 * Delete every object belonging to a user, for account deletion.
 *
 * Reads the keys from Postgres *first* and on purpose: the `Asset` rows are the
 * only record of which objects are this user's (keys are opaque UUIDs with no
 * account prefix), and the cascade that follows account deletion destroys them.
 * Once those rows are gone the objects are unattributable and would sit in the
 * bucket forever.
 *
 * Objects are removed in batches with DeleteObjects rather than one call each,
 * so an account with hundreds of uploads doesn't hold the request open.
 */
export async function deleteAllUserObjects(userId: string): Promise<number> {
  const { prisma } = await import("./db");
  const assets = await prisma.asset.findMany({
    where: { userId },
    select: { key: true },
  });
  if (assets.length === 0) return 0;

  const BATCH = 1000; // DeleteObjects caps at 1000 keys per call.
  let deleted = 0;
  for (let i = 0; i < assets.length; i += BATCH) {
    const chunk = assets.slice(i, i + BATCH);
    const res = await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((a) => ({ Key: a.key })), Quiet: true },
      })
    );
    if (res.Errors?.length) {
      console.error("[r2] some objects failed to delete", res.Errors.length, res.Errors[0]);
    }
    deleted += chunk.length - (res.Errors?.length ?? 0);
  }
  return deleted;
}

/** Browser-facing URL for an object key. */
export function publicUrlFor(key: string): string {
  if (hasPublicDomain) return `${publicUrl.replace(/\/$/, "")}/${key}`;
  // App-served fallback; key segments are already URL-safe (cuid + ext).
  return `/api/assets/${key}`;
}
