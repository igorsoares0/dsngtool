import { prisma } from "../../../lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { key?: string; deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ valid: false, reason: "bad_request" }, { status: 400 });
  }

  const key = body.key?.trim().toUpperCase();
  if (!key) {
    return Response.json({ valid: false, reason: "missing_key" }, { status: 400 });
  }

  const license = await prisma.license.findUnique({
    where: { key },
    include: { activations: true },
  });

  if (!license) {
    return Response.json({ valid: false, reason: "not_found" }, { status: 404 });
  }
  if (license.status !== "active") {
    return Response.json({ valid: false, reason: license.status });
  }

  // Soft device-activation limit: known devices always pass; new devices are
  // recorded until the cap, then rejected.
  const deviceId = body.deviceId?.trim();
  if (deviceId) {
    const known = license.activations.some((a) => a.deviceId === deviceId);
    if (!known) {
      if (license.activations.length >= license.maxActivations) {
        return Response.json({ valid: false, reason: "activation_limit" });
      }
      await prisma.activation.create({
        data: { licenseId: license.id, deviceId },
      });
      await prisma.license.update({
        where: { id: license.id },
        data: { activationCount: { increment: 1 } },
      });
    }
  }

  return Response.json({
    valid: true,
    tier: license.tier,
    email: license.email,
    key: license.key,
  });
}
