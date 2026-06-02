import { EventName } from "@paddle/paddle-node-sdk";
import { paddle } from "../../../lib/server/paddle";
import { prisma } from "../../../lib/server/db";
import { generateKey } from "../../../lib/server/license";
import { sendLicenseEmail } from "../../../lib/server/email";

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

  // Only one-time purchase completion grants a license.
  if (event.eventType === EventName.TransactionCompleted) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = event.data as any;
    const externalId: string = data.id; // txn_...

    try {
      const existing = await prisma.license.findUnique({ where: { externalId } });
      if (existing) {
        // Idempotent: retried webhook for an already-fulfilled transaction.
        return new Response("ok", { status: 200 });
      }

      // transaction.completed does not include the email; fetch the customer.
      let email: string | null = data.customData?.email ?? null;
      if (!email && data.customerId) {
        try {
          const customer = await paddle.customers.get(data.customerId);
          email = customer.email ?? null;
        } catch (err) {
          console.error("[paddle] could not fetch customer", err);
        }
      }

      const key = generateKey();
      await prisma.license.create({
        data: {
          key,
          source: "paddle",
          status: "active",
          tier: "pro",
          email,
          externalId,
          raw: data,
        },
      });

      if (email) {
        try {
          await sendLicenseEmail({ to: email, key, idempotencyKey: externalId });
        } catch (err) {
          // Don't fail the webhook on email errors — the key is stored and is
          // also shown on the post-checkout success screen.
          console.error("[paddle] license email failed", err);
        }
      }
    } catch (err) {
      console.error("[paddle] fulfillment failed", err);
      // 500 tells Paddle to retry.
      return new Response("Fulfillment error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
