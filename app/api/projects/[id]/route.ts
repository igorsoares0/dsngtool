import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "../../../lib/server/session";
import { prisma } from "../../../lib/server/db";

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
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => ({}))) as PutBody;
  if (!body.data || typeof body.name !== "string" || !body.updatedAt) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const updatedAt = new Date(body.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) {
    return NextResponse.json({ error: "invalid_updatedAt" }, { status: 400 });
  }

  const existing = await prisma.project.findUnique({
    where: { id },
    select: { userId: true, updatedAt: true },
  });

  if (existing && existing.userId !== session.user.id) {
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
    create: { id, userId: session.user.id, ...fields },
    update: fields,
  });

  return NextResponse.json({ ok: true });
}

/** Tombstone a project so the deletion syncs to the user's other devices. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
