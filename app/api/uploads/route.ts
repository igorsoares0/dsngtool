import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "../../lib/server/session";
import { prisma } from "../../lib/server/db";
import { putObject, deleteObject, publicUrlFor } from "../../lib/server/r2";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  canFit,
  getStorageStatus,
  sniffImageType,
} from "../../lib/server/storage";
import { LIMITS, rateLimit, tooManyRequests } from "../../lib/server/rate-limit";

// R2 (S3 SDK) + Prisma require the Node runtime.
export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Upload one image. multipart/form-data: `file` (+ optional `width`,`height`). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const limited = rateLimit(`upload:${userId}`, LIMITS.upload.limit, LIMITS.upload.window);
  if (!limited.ok) return tooManyRequests(limited);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  // Cheap rejection on the declared type first, so an obviously wrong upload
  // doesn't get buffered into memory. It is not the check that matters.
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_UPLOAD_BYTES },
      { status: 413 }
    );
  }

  // Quota check happens before the write so we never store past the ceiling.
  if (!(await canFit(userId, file.size))) {
    const status = await getStorageStatus(userId);
    return NextResponse.json(
      { error: "quota_exceeded", ...status },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // The check that matters: the bytes decide the type, not the client. Storing
  // the sniffed type means the Content-Type we later serve is one we derived
  // ourselves, so the bucket can't be loaded with arbitrary content wearing an
  // image label.
  const mimeType = sniffImageType(buffer);
  if (!mimeType || !ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  // No userId in the key: object URLs end up in exported designs and shared
  // projects, and the key should not carry an account identifier around with
  // them. The UUID is the only thing making the object hard to guess.
  const key = `${randomUUID()}.${EXT[mimeType]}`;

  const width = toInt(form.get("width"));
  const height = toInt(form.get("height"));

  try {
    await putObject(key, buffer, mimeType);
  } catch (err) {
    console.error("[uploads] R2 put failed", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 502 });
  }

  // Record only after the object is safely in R2, so usage never over-counts.
  const asset = await prisma.asset.create({
    data: { userId, key, bytes: file.size, mimeType, width, height },
  });

  const status = await getStorageStatus(userId);
  return NextResponse.json({
    id: asset.id,
    key,
    url: publicUrlFor(key),
    bytes: file.size,
    width,
    height,
    storage: status,
  });
}

/** Delete an asset the caller owns, freeing its quota. Body: { key }. */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = rateLimit(
    `upload:${session.user.id}`,
    LIMITS.upload.limit,
    LIMITS.upload.window
  );
  if (!limited.ok) return tooManyRequests(limited);

  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  if (!key) return NextResponse.json({ error: "missing_key" }, { status: 400 });

  const asset = await prisma.asset.findUnique({ where: { key } });
  if (!asset || asset.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await deleteObject(key);
  } catch (err) {
    // If the object is already gone, still drop the row so usage frees up.
    console.error("[uploads] R2 delete failed", err);
  }
  await prisma.asset.delete({ where: { id: asset.id } });

  return NextResponse.json({ ok: true, storage: await getStorageStatus(session.user.id) });
}

function toInt(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
