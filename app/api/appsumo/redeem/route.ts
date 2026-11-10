import { activateUrl, appUrl, issueLicense } from "../../../lib/server/license";
import { redeemCode } from "../../../lib/server/appsumo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AppSumo OAuth redirect. The buyer clicks "Activate" on AppSumo, lands here
 * with a one-time `code`, and leaves with their Modo key already in the app.
 *
 * The redirect target is always our own /activate page — never a URL taken
 * from the request — and the key rides in the fragment so it stays out of logs.
 */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");

  // The Partner Portal validates this URL with a bare GET and wants a 200.
  if (!code) return new Response("ok", { status: 200 });

  try {
    const remote = await redeemCode(code);
    const license = await issueLicense({ source: "appsumo", externalId: remote.license_key });
    if (license.status !== "active") {
      return Response.redirect(`${appUrl()}/activate?error=revoked`, 302);
    }
    return Response.redirect(activateUrl(license.key), 302);
  } catch (err) {
    console.error("[appsumo] redeem failed", err);
    return Response.redirect(`${appUrl()}/activate?error=appsumo`, 302);
  }
}
