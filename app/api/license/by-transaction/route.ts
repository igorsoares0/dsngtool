import { prisma } from "../../../lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Used by the post-checkout success screen to show the key once the Paddle
// webhook has created the license. The client polls this for a few seconds.
export async function GET(req: Request) {
  const txn = new URL(req.url).searchParams.get("txn")?.trim();
  if (!txn) {
    return Response.json({ ready: false, reason: "missing_txn" }, { status: 400 });
  }

  const license = await prisma.license.findUnique({
    where: { externalId: txn },
    select: { key: true, email: true, tier: true },
  });

  if (!license) return Response.json({ ready: false });
  return Response.json({ ready: true, ...license });
}
