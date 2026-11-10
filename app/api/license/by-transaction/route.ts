import { prisma } from "../../../lib/server/db";
import { keyFor } from "../../../lib/server/license";
import { LIMITS, clientIp, rateLimit, tooManyRequests } from "../../../lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polled by the activation screen right after a Paddle checkout, until the
 * webhook has created the license. Returns the key so the app can activate
 * itself without the buyer opening their email.
 *
 * Knowing a transaction id is the credential here, same as Paddle's own
 * receipt links. It is only ever seen by the buyer (checkout + receipt).
 */
export async function GET(req: Request) {
  const limited = rateLimit(
    `txn:${clientIp(req)}`,
    LIMITS.licenseByTransaction.limit,
    LIMITS.licenseByTransaction.window
  );
  if (!limited.ok) return tooManyRequests(limited);

  const txn = new URL(req.url).searchParams.get("txn")?.trim();
  if (!txn || !/^txn_[a-z0-9]{10,64}$/i.test(txn)) {
    return Response.json({ ready: false, error: "bad_txn" }, { status: 400 });
  }

  const license = await prisma.license.findUnique({
    where: { externalId: txn },
    select: { id: true, source: true, status: true },
  });
  if (!license || license.status !== "active") return Response.json({ ready: false });

  return Response.json(
    { ready: true, key: await keyFor(license) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
