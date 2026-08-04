import { NextResponse } from "next/server";
import { getSession } from "../../lib/server/session";
import { prisma } from "../../lib/server/db";

export const runtime = "nodejs";

/**
 * All of the user's projects, including tombstones (deletedAt set) so the
 * client can propagate deletions across devices. This is the pull half of sync.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, data: true, updatedAt: true, deletedAt: true },
  });

  return NextResponse.json({ projects });
}
