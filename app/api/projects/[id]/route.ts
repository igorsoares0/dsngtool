import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "../../../lib/server/session";
import { prisma } from "../../../lib/server/db";
import { LIMITS, rateLimit, tooManyRequests } from "../../../lib/server/rate-limit";
import {
  MAX_PROJECTS_PER_USER,
  MAX_PROJECT_BYTES,
  MAX_PROJECT_NAME_LENGTH,
} from "../../../lib/server/storage";

export const runtime = "nodejs";

interface PutBody {
  name?: string;
  data?: unknown;
  updatedAt?: string;
}

/**
 * Upsert a project (the push half of sync). Last-write-wins: if the stored copy
 * is newer than the incoming `updatedAt`, the write is skipped so a stale device
 * can't clobber a fresher edit made elsewhere.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const limited = rateLimit(
    `project:${userId}`,
    LIMITS.projectWrite.limit,
    LIMITS.projectWrite.window
  );
  if (!limited.ok) return tooManyRequests(limited);

  const { id } = await ctx.params;

  // Read as text so the payload can be measured before it is parsed: route
  // handlers have no built-in body limit, and JSON.parse on an unbounded string
  // is the expensive step we're trying not to reach.
  const raw = await req.text();
  if (raw.length > MAX_PROJECT_BYTES) {
    return NextResponse.json(
      { error: "project_too_large", maxBytes: MAX_PROJECT_BYTES },
      { status: 413 }
    );
  }

  let body: PutBody;
  try {
    body = JSON.parse(raw) as PutBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.data || typeof body.name !== "string" || !body.updatedAt) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (body.name.length > MAX_PROJECT_NAME_LENGTH) {
    return NextResponse.json({ error: "name_too_long" }, { status: 400 });
  }
  const updatedAt = new Date(body.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return NextResponse.json({ error: "invalid_updatedAt" }, { status: 400 });
  }

  const existing = await prisma.project.findUnique({
    where: { id },
    select: { userId: true, updatedAt: true },
  });

  // Only creations count against the ceiling — an existing project must stay
  // writable even at the cap, or a user who hits it can no longer save.
  // Tombstones count too: they are rows, and undeleting one is a create here.
  if (!existing) {
    const count = await prisma.project.count({ where: { userId } });
    if (count >= MAX_PROJECTS_PER_USER) {
      return NextResponse.json(
        { error: "project_limit_reached", max: MAX_PROJECTS_PER_USER },
        { status: 409 }
      );
    }
  }

  if (existing && existing.userId !== userId) {
    // Never let one user overwrite another's project (client ids are guessable).
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (existing && existing.updatedAt >= updatedAt) {
    // Stored copy is newer or equal — ignore this stale push.
    return NextResponse.json({ ok: true, skipped: "stale" });
  }

  const fields = {
    name: body.name,
    data: body.data as object,
    updatedAt,
    deletedAt: null,
  };
  await prisma.project.upsert({
    where: { id },
    create: { id, userId, ...fields },
    update: fields,
  });

  return NextResponse.json({ ok: true });
}

/** Tombstone a project so the deletion syncs to the user's other devices. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limited = rateLimit(
    `project:${session.user.id}`,
    LIMITS.projectWrite.limit,
    LIMITS.projectWrite.window
  );
  if (!limited.ok) return tooManyRequests(limited);

  const { id } = await ctx.params;

  const existing = await prisma.project.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) return NextResponse.json({ ok: true }); // already gone
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
