import { paddle } from "../../../lib/server/paddle";
import { activateUrl, issueLicense, setLicenseStatus } from "../../../lib/server/license";
import { sendLicenseEmail } from "../../../lib/server/email";

// Raw-body signature verification and Prisma need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paddle → license lifecycle.
 *
 *  - transaction.completed for the lifetime price: create the License, email the key.
 *  - adjustment.created/updated, approved refund or chargeback: revoke it.
 *    A reversed chargeback reactivates it.
 *
 * Every branch is idempotent (keyed on the transaction id), because Paddle
 * retries anything that doesn't get a 2xx.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("paddle-signature") ?? "";
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? "";
  // Must use the exact raw body — do not parse before verifying the signature.
  const rawBody = await req.text();

  // Signature only (HMAC-SHA256 over `${ts}:${rawBody}` plus the replay
  // window), then our own parse of the few fields we read. The SDK's
  // `unmarshal` also builds full entity objects and throws on any payload
  // shape it doesn't expect — which would surface as a bogus 400 here.
  let valid = false;
  try {
    valid = await paddle.webhooks.isSignatureValid(rawBody, secret, signature);
  } catch {
    valid = false;
  }
  if (!valid) {
    console.error("[paddle] signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: { event_type?: string; data?: unknown };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  try {
    if (event.event_type === "transaction.completed") {
      await fulfil(event.data as CompletedTransaction);
    } else if (
      event.event_type === "adjustment.created" ||
      event.event_type === "adjustment.updated"
    ) {
      await adjust(event.data as Adjustment);
    }
  } catch (err) {
    console.error(`[paddle] ${event.event_type} failed`, err);
    // 500 tells Paddle to retry.
    return new Response("Processing error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

/** The parts of Paddle's raw (snake_case) transaction payload we use. */
interface CompletedTransaction {
  id: string;
  customer_id?: string | null;
  items?: Array<{ price?: { id?: string } | null }>;
}

async function fulfil(txn: CompletedTransaction) {
  const ltdPrice = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_LTD;
  const isLtd = (txn.items ?? []).some((i) => i.price?.id === ltdPrice);
  if (!ltdPrice || !isLtd) return;

  // transaction.completed carries no email; it lives on the customer.
  let email: string | null = null;
  if (txn.customer_id) {
    try {
      email = (await paddle.customers.get(txn.customer_id)).email ?? null;
    } catch (err) {
      // Not fatal: the checkout's success screen shows the key anyway.
      console.error("[paddle] could not fetch customer for", txn.id, err);
    }
  }

  const license = await issueLicense({ source: "paddle", externalId: txn.id, email });

  if (license.email) {
    try {
      await sendLicenseEmail({
        to: license.email,
        key: license.key,
        activateUrl: activateUrl(license.key),
        // Resend dedupes on this, so a retried webhook can't double-send.
        idempotencyKey: `license-${txn.id}`,
      });
    } catch (err) {
      // The license exists and the checkout screen shows it; don't make Paddle
      // retry the whole event over an email hiccup.
      console.error("[paddle] license email failed for", txn.id, err);
    }
  }
}

interface Adjustment {
  transaction_id: string;
  action: string;
  type: string;
  status: string;
}

async function adjust(adj: Adjustment) {
  if (adj.status !== "approved") return;
  // A partial refund (a discount after the fact) leaves the license intact.
  const revokes = (adj.action === "refund" && adj.type === "full") || adj.action === "chargeback";
  if (revokes) {
    await setLicenseStatus(adj.transaction_id, "revoked");
  } else if (adj.action === "chargeback_reverse") {
    await setLicenseStatus(adj.transaction_id, "active");
  }
}
