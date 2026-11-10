import { prisma } from "../../../lib/server/db";
import { isLicenseId } from "../../../lib/license/format";
import { LIMITS, clientIp, rateLimit, tooManyRequests } from "../../../lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Is this license still good?" — the app's best-effort daily check. The key
 * itself is verified on the device; this only catches refunds and AppSumo
 * deactivations. Unknown ids answer "active": a manual key issued before its
 * row existed should not lock anyone out, and the app fails open anyway.
 */
export async function GET(req: Request) {
  const limited = rateLimit(
    `status:${clientIp(req)}`,
    LIMITS.licenseStatus.limit,
    LIMITS.licenseStatus.window
  );
  if (!limited.ok) return tooManyRequests(limited);

  const id = new URL(req.url).searchParams.get("id")?.trim().toUpperCase() ?? "";
  if (!isLicenseId(id)) return Response.json({ error: "bad_id" }, { status: 400 });

  const row = await prisma.license.findUnique({ where: { id }, select: { status: true } });
  return Response.json(
    { status: row?.status === "revoked" ? "revoked" : "active" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
