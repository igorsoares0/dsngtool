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
 * Opens the Paddle overlay checkout for the LTD price and resolves with the
 * transaction id once the purchase completes. Rejects if the checkout closes
 * without completing.
 */
export function openCheckout(email?: string): Promise<CheckoutResult> {
  return new Promise(async (resolve, reject) => {
    let settled = false;

    activeHandler = (data, name) => {
      if (name === CheckoutEventNames.CHECKOUT_COMPLETED) {
        settled = true;
        const txn = (data as { transaction_id?: string } | undefined)?.transaction_id;
        activeHandler = null;
        if (txn) resolve({ transactionId: txn });
        else reject(new Error("missing_transaction_id"));
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
      items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID ?? "", quantity: 1 }],
      ...(email ? { customer: { email }, customData: { email } } : {}),
    });
  });
}

/** Polls our backend for the license created by the Paddle webhook. */
export async function pollLicenseForTransaction(
  transactionId: string,
  { attempts = 15, intervalMs = 2000 } = {}
): Promise<{ key: string; tier: string; email: string | null } | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(
        `/api/license/by-transaction?txn=${encodeURIComponent(transactionId)}`
      );
      const data = await res.json();
      if (data.ready) return { key: data.key, tier: data.tier, email: data.email };
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
