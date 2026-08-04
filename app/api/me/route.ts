import { NextResponse } from "next/server";
import { getSession } from "../../lib/server/session";
import { getStorageStatus, isPro } from "../../lib/server/storage";

export const runtime = "nodejs";

/** Current user's entitlement + storage usage. Drives the storage meter and the
 *  post-checkout refresh. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const [pro, storage] = await Promise.all([isPro(userId), getStorageStatus(userId)]);

  return NextResponse.json({
    user: { id: userId, email: session.user.email, name: session.user.name },
    pro,
    storage,
  });
}
