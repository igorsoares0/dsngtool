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
  /** Transaction id (txn_...), used to fetch the key the webhook creates. */
  transactionId: string;
}

/**
 * Opens the Paddle checkout for the lifetime license. Resolves with the
 * transaction id on completion; rejects with "closed" if the buyer backs out.
 * The license itself is created by the webhook, so follow up with
 * `pollLicenseForTransaction`.
 */
export function openLtdCheckout(): Promise<CheckoutResult> {
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
      items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_LTD ?? "", quantity: 1 }],
    });
  });
}

/**
 * Wait for the webhook to create the license for a finished checkout and
 * return its key. Gives up after ~40s; the key also arrives by email.
 */
export async function pollLicenseForTransaction(
  transactionId: string,
  { attempts = 20, intervalMs = 2000 } = {}
): Promise<string | null> {
  if (!transactionId) return null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`/api/license/by-transaction?txn=${encodeURIComponent(transactionId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { ready?: boolean; key?: string };
        if (data.ready && data.key) return data.key;
      }
    } catch {
      // network blip — keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
