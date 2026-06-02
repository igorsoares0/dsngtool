import { prisma } from "../../../lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AppSumo licensing webhook — STUB. Implement when approved on AppSumo.
 *
 * AppSumo POSTs license events to this endpoint and expects a license-key
 * validation endpoint on our side. Events to handle:
 *   - activate       -> create License (source "appsumo", status "active")
 *   - enhance_tier    -> bump `tier` (code stacking)
 *   - reduce_tier     -> lower `tier`
 *   - upgrade         -> map plan change
 *   - refund/deactivate -> set status "refunded" / "deactivated"
 *
 * The unified `License` model already supports this via `source = "appsumo"`,
 * `externalId` = AppSumo's license uuid, and the string `tier` field for
 * stacking. Validation reuses POST /api/license/validate.
 *
 * TODO before launch on AppSumo:
 *   - Verify AppSumo request signature / shared secret.
 *   - Map their event payload to upsert by externalId.
 *   - Confirm tier names with the deal's stacking config.
 */
export async function POST(req: Request) {
  void prisma; // referenced so the import stays wired for the real implementation
  const payload = await req.text();
  console.warn("[appsumo] webhook received but not yet implemented", payload.slice(0, 500));
  return new Response(
    JSON.stringify({ ok: false, reason: "not_implemented" }),
    { status: 501, headers: { "content-type": "application/json" } }
  );
}
