"use client";

import { useState } from "react";
import { useEntitlementStore } from "../../store/entitlement-store";
import { useSession } from "../../lib/auth-client";
import { openSubscriptionCheckout } from "../../lib/paddle-checkout";
import { toast } from "../../store/toast-store";
import Modal from "../ui/modal";

// Only claim what the server actually gates. Exports have been watermark-free
// on every tier since the LTD was dropped — selling that back would be selling
// something the user already has.
const PERKS = [
  "1 GB of cloud storage (vs 250 MB free)",
  "100 AI generations per month (vs 5)",
  "All 6 premium templates unlocked",
  "Projects synced across your devices",
];

export default function UpgradeModal() {
  const open = useEntitlementStore((s) => s.modalOpen);
  if (!open) return null;
  return <UpgradeModalContent />;
}

function UpgradeModalContent() {
  const reason = useEntitlementStore((s) => s.upsellReason);
  const pro = useEntitlementStore((s) => s.pro);
  const close = useEntitlementStore((s) => s.closeModal);
  const refresh = useEntitlementStore((s) => s.refresh);
  const { data: session } = useSession();

  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    if (!session?.user) {
      setError("Please sign in first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await openSubscriptionCheckout({
        userId: session.user.id,
        email: session.user.email,
      });
      // The subscription is created asynchronously by the webhook. Poll our
      // entitlement until it flips to pro (or give up after ~30s).
      setBusy(false);
      setPending(true);
      toast.info("Finishing up your subscription…");
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        await refresh();
        if (useEntitlementStore.getState().pro) {
          toast.success("You're on Pro — 1GB unlocked 🎉");
          close();
          return;
        }
      }
      setPending(false);
      setError("Payment received — your plan will activate shortly. Refresh in a moment.");
    } catch (e) {
      setBusy(false);
      const msg = (e as Error)?.message;
      if (msg && msg !== "closed") setError("Checkout couldn't start. Please try again.");
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={pro ? "Your Pro plan" : "Upgrade to Modo Pro"}
      subtitle={pro ? undefined : "Everything in Free, with room to work."}
      width="max-w-md"
    >
      <div className="flex flex-col gap-4">
        {pro ? (
          <p className="text-[13px] text-text-secondary leading-relaxed">
            You&apos;re on the <strong className="text-text-primary">Pro</strong> plan — 1GB
            storage and all premium features are unlocked. Manage or cancel your subscription
            anytime from the receipt email Paddle sent you.
          </p>
        ) : (
          <>
            {reason && (
              <div className="text-[11.5px] text-accent-tint-fg bg-accent-tint border border-accent/25 rounded-md px-3 py-2">
                {reason}
              </div>
            )}

            <ul className="flex flex-col gap-2">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                  <CheckIcon className="w-3.5 h-3.5 text-accent mt-[3px] shrink-0" />
                  {p}
                </li>
              ))}
            </ul>

            <button
              onClick={subscribe}
              disabled={busy || pending}
              className="bg-accent hover:bg-accent-hover disabled:opacity-60 text-accent-fg text-[13px] font-semibold py-2.5 rounded-md transition-colors duration-150 ease-standard flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {busy
                ? "Opening checkout…"
                : pending
                  ? "Activating…"
                  : "Subscribe — $10/month"}
            </button>

            <p className="text-[11.5px] text-text-ghost text-center">
              Cancel anytime. Secure checkout by Paddle.
            </p>

            {error && (
              <div className="text-[11.5px] text-danger bg-danger-tint border border-danger/25 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
