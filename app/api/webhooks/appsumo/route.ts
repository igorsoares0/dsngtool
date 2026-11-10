import { prisma } from "../../../lib/server/db";
import { issueLicense, setLicenseStatus } from "../../../lib/server/license";
import { verifyWebhookSignature } from "../../../lib/server/appsumo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AppSumoEvent {
  license_key?: string;
  prev_license_key?: string;
  event?: string;
  license_status?: string;
  tier?: number;
  test?: boolean;
}

/** AppSumo wants the event echoed back with success: true and a 200. */
function ack(event: string | undefined, message?: string) {
  return Response.json({ success: true, event: event ?? null, message });
}

/**
 * AppSumo license lifecycle. Events: purchase, activate, upgrade, downgrade,
 * deactivate (refund), migrate (add-ons — none for Modo).
 *
 * AppSumo never sends a customer email; the buyer only reaches us through the
 * OAuth redeem (app/api/appsumo/redeem), which reads the same row.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  let body: AppSumoEvent;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ success: false, error: "bad_json" }, { status: 400 });
  }

  // The portal's URL check: answer it, touch nothing. Its data is not real.
  if (body.test === true) return ack(body.event, "test acknowledged");

  const ok = verifyWebhookSignature(
    rawBody,
    req.headers.get("x-appsumo-timestamp"),
    req.headers.get("x-appsumo-signature")
  );
  if (!ok) {
    console.error("[appsumo] signature verification failed");
    return Response.json({ success: false, error: "bad_signature" }, { status: 401 });
  }

  const { event, license_key: licenseKey } = body;
  if (!licenseKey) return Response.json({ success: false, error: "no_license_key" }, { status: 400 });
  const tier = body.tier != null ? String(body.tier) : null;

  try {
    switch (event) {
      case "purchase":
      case "activate":
        await issueLicense({ source: "appsumo", externalId: licenseKey, tier });
        break;

      case "upgrade":
      case "downgrade": {
        // AppSumo swaps the buyer onto a new license_key. Re-point the existing
        // row instead of creating one, so the Modo key the buyer already
        // activated (it embeds our row id) stays valid.
        const prev = body.prev_license_key
          ? await prisma.license.findUnique({ where: { externalId: body.prev_license_key } })
          : null;
        if (prev) {
          await prisma.license.update({
            where: { id: prev.id },
            data: { externalId: licenseKey, tier, status: "active", revokedAt: null },
          });
        } else {
          await issueLicense({ source: "appsumo", externalId: licenseKey, tier });
        }
        break;
      }

      case "deactivate":
        await setLicenseStatus(licenseKey, "revoked");
        break;

      default:
        // migrate and anything new: nothing to do, but don't make AppSumo retry.
        console.warn("[appsumo] unhandled event", event);
    }
  } catch (err) {
    console.error(`[appsumo] ${event} failed`, err);
    return Response.json({ success: false, error: "internal" }, { status: 500 });
  }

  return ack(event);
}
