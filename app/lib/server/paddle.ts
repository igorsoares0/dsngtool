import "server-only";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

// Server-side Paddle SDK instance, used to verify webhooks and look up customers.
const env =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? Environment.production
    : Environment.sandbox;

export const paddle = new Paddle(process.env.PADDLE_API_KEY ?? "", {
  environment: env,
});

/**
 * Cancel every subscription that could still bill this user, immediately.
 *
 * Called when an account is deleted. Deliberately throws on failure: the caller
 * treats a billing error as a reason to abort the deletion entirely, because
 * the alternative — no account, live subscription — bills a customer who has no
 * way left to reach us.
 *
 * `effectiveFrom: "immediately"` rather than the default end-of-period: keeping
 * a deleted account's subscription running to the period end would leave a row
 * pointing at a user that no longer exists.
 */
export async function cancelActiveSubscriptions(userId: string): Promise<void> {
  const { prisma } = await import("./db");
  const subs = await prisma.subscription.findMany({
    where: { userId, status: { in: ["active", "trialing", "past_due", "paused"] } },
    select: { id: true },
  });

  for (const sub of subs) {
    try {
      await paddle.subscriptions.cancel(sub.id, { effectiveFrom: "immediately" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // A cancel that fails because the subscription is *already* settled is
      // not a failure — the goal state (nothing can bill this user) holds
      // either way. But decide that by asking Paddle for the actual status
      // rather than pattern-matching the error text: the wording is Paddle's to
      // change, and getting it wrong in the lenient direction deletes an
      // account that can still be billed. Real messages seen in sandbox:
      //   "Subscription sub_… not found."
      //   "cannot update subscription, as subscription is canceled"
      if (await isNoLongerBillable(sub.id)) {
        console.warn(`[paddle] subscription ${sub.id} already settled at cancel: ${message}`);
        continue;
      }
      throw new Error(`Failed to cancel subscription ${sub.id}: ${message}`);
    }
  }
}

/**
 * Whether Paddle agrees this subscription can no longer charge anyone.
 * A subscription that has vanished counts: it cannot bill either.
 */
async function isNoLongerBillable(subscriptionId: string): Promise<boolean> {
  try {
    const sub = await paddle.subscriptions.get(subscriptionId);
    return sub.status === "canceled";
  } catch (err) {
    // Only a subscription Paddle says does not exist is safe to treat as
    // settled. Any other failure here — network, credentials, an outage — tells
    // us nothing about whether the card can still be charged, so it must count
    // as "still billable" and abort the deletion. Guessing optimistically is
    // how you end up billing someone who no longer has an account.
    const message = err instanceof Error ? err.message : String(err);
    return /not found/i.test(message);
  }
}
