"use client";

import {
  initializePaddle,
  CheckoutEventNames,
  type Paddle,
  type CheckoutEventsData,
} from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

// Paddle.js is initialized once and its eventCallback is fixed for the page
// lifetime, so we dispatch to a swappable handler that the active checkout sets.
type EventHandler = (data: CheckoutEventsData | undefined, name: string) => void;
let activeHandler: EventHandler | null = null;

function getPaddle(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
    const environment =
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";
    paddlePromise = initializePaddle({
      token,
      environment,
      eventCallback: (e) => activeHandler?.(e.data, e.name ?? ""),
    });
  }
  return paddlePromise;
}

export interface CheckoutResult {
  /** transaction id (txn_...) used to fetch the generated license. */
  transactionId: string;
}

/**
 * Opens the Paddle checkout for the monthly subscription. `userId` is passed as
 * customData so the subscription webhook can attribute the resulting sub to this
 * user. Resolves with the transaction id on completion; the Subscription row
 * itself is created asynchronously by the webhook, so the caller should refresh
 * entitlement (poll /api/me) shortly after.
 */
export function openSubscriptionCheckout(opts: {
  userId: string;
  email?: string;
}): Promise<CheckoutResult> {
  return new Promise(async (resolve, reject) => {
    let settled = false;

    activeHandler = (data, name) => {
      if (name === CheckoutEventNames.CHECKOUT_COMPLETED) {
        settled = true;
        const txn = (data as { transaction_id?: string } | undefined)?.transaction_id;
        activeHandler = null;
        resolve({ transactionId: txn ?? "" });
      } else if (name === CheckoutEventNames.CHECKOUT_CLOSED && !settled) {
        activeHandler = null;
        reject(new Error("closed"));
      }
    };

    const paddle = await getPaddle();
    if (!paddle) {
      activeHandler = null;
      reject(new Error("paddle_init_failed"));
      return;
    }

    paddle.Checkout.open({
      items: [
        { priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY ?? "", quantity: 1 },
      ],
      customData: { userId: opts.userId },
      ...(opts.email ? { customer: { email: opts.email } } : {}),
    });
  });
}
