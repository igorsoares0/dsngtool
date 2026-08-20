import { NextResponse } from "next/server";
import { getAuthMethods, getSession } from "../../lib/server/session";
import { getStorageStatus, isPro } from "../../lib/server/storage";

export const runtime = "nodejs";

/** Current user's entitlement + storage usage. Drives the storage meter and the
 *  post-checkout refresh. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const [pro, storage, authMethods] = await Promise.all([
    isPro(userId),
    getStorageStatus(userId),
    getAuthMethods(userId),
  ]);

  return NextResponse.json({
    user: { id: userId, email: session.user.email, name: session.user.name },
    pro,
    storage,
    // Drives the delete-account UI: a social-only account has no password
    // to confirm with and must re-authenticate through its provider instead.
    auth: authMethods,
  });
}
