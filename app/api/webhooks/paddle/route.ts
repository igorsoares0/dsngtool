import { paddle } from "../../../lib/server/paddle";
import { prisma } from "../../../lib/server/db";

// Prisma + raw body verification require the Node runtime, never edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("paddle-signature") ?? "";
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? "";
  // Must use the exact raw body — do not parse before verifying the signature.
  const rawBody = await req.text();

  let event;
  try {
    // unmarshal verifies HMAC-SHA256 over `${ts}:${rawBody}` and the ~5s replay window.
    event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
  } catch (err) {
    console.error("[paddle] signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!event) return new Response("ok", { status: 200 });

  // The subscription lifecycle drives entitlement. Every subscription.* event
  // (created, activated, updated, past_due, paused, resumed, canceled, trialing)
  // carries the full subscription state, so a single upsert keeps our mirror in
  // sync regardless of which one fired.
  if (event.eventType.startsWith("subscription.")) {
    try {
      await syncSubscription(event.data as SubscriptionData);
    } catch (err) {
      console.error("[paddle] subscription sync failed", err);
      // 500 tells Paddle to retry.
      return new Response("Sync error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}

interface SubscriptionData {
  id: string;
  status: string;
  customerId?: string | null;
  customData?: { userId?: string } | null;
  currentBillingPeriod?: { endsAt?: string | null } | null;
  scheduledChange?: { action?: string; effectiveAt?: string | null } | null;
  canceledAt?: string | null;
  items?: Array<{ price?: { id?: string | null } | null }> | null;
}

async function syncSubscription(data: SubscriptionData) {
  const userId = await resolveUserId(data);
  if (!userId) {
    // Can't attribute this subscription to a user — log and ack so Paddle stops
    // retrying (retrying won't help without attribution data). The subscription
    // id is enough to find it in the Paddle dashboard; the customer id is not
    // logged, since these lines end up in Coolify's log store.
    console.error("[paddle] no user for subscription", data.id);
    return;
  }

  const priceId = data.items?.[0]?.price?.id ?? null;
  const currentPeriodEnd = data.currentBillingPeriod?.endsAt
    ? new Date(data.currentBillingPeriod.endsAt)
    : null;
  const cancelScheduledAt =
    data.scheduledChange?.action === "cancel" && data.scheduledChange.effectiveAt
      ? new Date(data.scheduledChange.effectiveAt)
      : null;
  const canceledAt = data.canceledAt ? new Date(data.canceledAt) : null;

  const fields = {
    userId,
    status: data.status,
    priceId,
    customerId: data.customerId ?? null,
    currentPeriodEnd,
    cancelScheduledAt,
    canceledAt,
  };

  await prisma.subscription.upsert({
    where: { id: data.id },
    create: { id: data.id, ...fields },
    update: fields,
  });
}

/**
 * Attribute a subscription to a Modo user. Preference order:
 *  1. customData.userId set at checkout (propagates from transaction → subscription)
 *  2. an existing row for this subscription id (later events may drop customData)
 *  3. the Paddle customer's email matched to a *verified* user (last resort)
 */
async function resolveUserId(data: SubscriptionData): Promise<string | null> {
  // customData originates in the browser (see app/lib/paddle-checkout.ts), so
  // it names a user rather than proving one. Confirm the id is real before
  // hanging entitlement off it — a typo or a stale id would otherwise create a
  // Subscription row pointing at nobody, and the FK would reject the write
  // anyway, just later and as a 500 that Paddle retries forever.
  const claimed = data.customData?.userId;
  if (claimed) {
    const user = await prisma.user.findUnique({
      where: { id: claimed },
      select: { id: true },
    });
    if (user) return user.id;
    console.error("[paddle] customData.userId does not exist", data.id);
  }

  const existing = await prisma.subscription.findUnique({
    where: { id: data.id },
    select: { userId: true },
  });
  if (existing) return existing.userId;

  if (data.customerId) {
    try {
      const customer = await paddle.customers.get(data.customerId);
      if (customer.email) {
        // `emailVerified` is the whole point of this filter. Sign-up does not
        // require verification (see app/lib/server/auth.ts), so an address
        // alone proves nothing: anyone can hold an account on someone else's
        // email. Matching on it unverified would hand that account a stranger's
        // subscription. An unverified payer falls through to the null branch,
        // which logs loudly and can be fixed by hand — the safe direction.
        const user = await prisma.user.findFirst({
          where: { email: customer.email, emailVerified: true },
          select: { id: true },
        });
        if (user) return user.id;
      }
    } catch (err) {
      console.error("[paddle] customer lookup failed", err);
    }
  }
  return null;
}
