import { NextResponse } from "next/server";
import { getAuthMethods, getSession } from "../../lib/server/session";
import { getStorageStatus, isPro } from "../../lib/server/storage";
import { prisma } from "../../lib/server/db";
import { FREE_MONTHLY, PRO_MONTHLY, currentMonth, quotaResetsAt } from "../../lib/ai-limits";

export const runtime = "nodejs";

/** Current user's entitlement, storage and AI usage. Drives the storage meter,
 *  the AI quota readouts and the post-checkout refresh. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const [pro, storage, authMethods, usage] = await Promise.all([
    isPro(userId),
    getStorageStatus(userId),
    getAuthMethods(userId),
    prisma.aiUsage.findUnique({
      where: { userId_month: { userId, month: currentMonth() } },
      select: { count: true },
    }),
  ]);

  return NextResponse.json({
    user: { id: userId, email: session.user.email, name: session.user.name },
    pro,
    storage,
    ai: {
      used: usage?.count ?? 0,
      limit: pro ? PRO_MONTHLY : FREE_MONTHLY,
      resetsAt: quotaResetsAt(),
    },
    // Drives the delete-account UI: a social-only account has no password
    // to confirm with and must re-authenticate through its provider instead.
    auth: authMethods,
  });
}
