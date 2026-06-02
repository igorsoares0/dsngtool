"use client";

import { useEffect, useState } from "react";
import { useLicenseStore } from "../../store/license-store";
import { getDeviceId, validateLicense } from "../../hooks/use-license";
import { openCheckout, pollLicenseForTransaction } from "../../lib/paddle-checkout";
import { toast } from "../../store/toast-store";
import { CloseIcon, LockIcon } from "./icons";

const PERKS = [
  "Watermark-free PNG / JPEG exports",
  "All premium templates unlocked",
  "Lifetime access — one-time payment",
];

export default function LicenseModal() {
  const open = useLicenseStore((s) => s.modalOpen);
  // Mount fresh on each open so local form state starts clean.
  if (!open) return null;
  return <LicenseModalContent />;
}

function LicenseModalContent() {
  const reason = useLicenseStore((s) => s.upsellReason);
  const tier = useLicenseStore((s) => s.tier);
  const close = useLicenseStore((s) => s.closeModal);
  const setLicense = useLicenseStore((s) => s.setLicense);

  const [keyInput, setKeyInput] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [purchasedKey, setPurchasedKey] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const activate = async (rawKey: string) => {
    const key = rawKey.trim().toUpperCase();
    if (!key) return;
    setActivating(true);
    setError(null);
    const deviceId = await getDeviceId();
    const result = await validateLicense(key, deviceId);
    setActivating(false);

    if (!result) {
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }
    if (!result.valid) {
      setError(reasonMessage(result.reason));
      return;
    }
    setLicense({
      key,
      tier: result.tier ?? "pro",
      email: result.email ?? null,
      validatedAt: Date.now(),
    });
    toast.success("License activated — everything unlocked 🎉");
    close();
  };

  const buy = async () => {
    setBuying(true);
    setError(null);
    try {
      const { transactionId } = await openCheckout();
      toast.info("Finishing up your purchase…");
      const license = await pollLicenseForTransaction(transactionId);
      if (license) {
        setPurchasedKey(license.key);
        setLicense({
          key: license.key,
          tier: (license.tier as "pro") ?? "pro",
          email: license.email,
          validatedAt: Date.now(),
        });
        toast.success("Purchase complete — license activated 🎉");
      } else {
        setError(
          "Payment received! Your key is on its way by email — paste it here once it arrives."
        );
      }
    } catch (e) {
      const msg = (e as Error)?.message;
      if (msg && msg !== "closed") {
        setError("Checkout couldn't start. Please try again.");
      }
    } finally {
      setBuying(false);
    }
  };

  const isPro = tier === "pro";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upgrade to Pro"
        className="relative bg-surface-1 border border-border-default rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <LockIcon className="w-4 h-4 text-accent-green" />
            {isPro ? "Your Pro license" : "Unlock Modo Pro"}
          </h2>
          <button
            onClick={close}
            aria-label="Close"
            className="text-text-ghost hover:text-text-secondary p-1 rounded transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {purchasedKey ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-secondary">
                Thanks for your purchase 🎉 Your lifetime license is now active on this
                device. We also emailed your key — keep it safe for your other devices.
              </p>
              <div className="bg-surface-2 border border-border-subtle rounded-lg px-4 py-3 text-center text-base font-bold tracking-[0.18em] text-text-primary">
                {purchasedKey}
              </div>
              <button
                onClick={close}
                className="bg-accent-green hover:bg-accent-green-hover text-surface-0 text-sm font-semibold py-2.5 rounded-lg transition-all"
              >
                Start designing
              </button>
            </div>
          ) : isPro ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary">
                You&apos;re on the <strong className="text-text-primary">Pro</strong>{" "}
                plan. All premium features are unlocked. 🎉
              </p>
              <p className="text-[11px] text-text-ghost break-all">
                Key: {useLicenseStore.getState().key}
              </p>
            </div>
          ) : (
            <>
              {reason && (
                <div className="text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 rounded-lg px-3 py-2">
                  {reason}
                </div>
              )}

              {/* Perks */}
              <ul className="flex flex-col gap-1.5">
                {PERKS.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-accent-green mt-0.5">✓</span>
                    {p}
                  </li>
                ))}
              </ul>

              {/* Buy */}
              <button
                onClick={buy}
                disabled={buying}
                className="bg-accent-green hover:bg-accent-green-hover disabled:opacity-60 text-surface-0 text-sm font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {buying ? "Opening checkout…" : "Get lifetime access — $47"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 text-[11px] text-text-ghost">
                <div className="h-px flex-1 bg-border-subtle" />
                already have a key?
                <div className="h-px flex-1 bg-border-subtle" />
              </div>

              {/* Activate */}
              <div className="flex flex-col gap-2">
                <input
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") activate(keyInput);
                  }}
                  placeholder="MODO-XXXX-XXXX-XXXX"
                  spellCheck={false}
                  autoCapitalize="characters"
                  className="bg-surface-2 border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost tracking-wider uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/50"
                />
                <button
                  onClick={() => activate(keyInput)}
                  disabled={activating || !keyInput.trim()}
                  className="border border-border-default hover:bg-surface-2 disabled:opacity-50 text-text-primary text-sm font-medium py-2 rounded-lg transition-all"
                >
                  {activating ? "Activating…" : "Activate license"}
                </button>
              </div>
            </>
          )}

          {error && <p className="text-xs text-accent-pink">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function reasonMessage(reason?: string): string {
  switch (reason) {
    case "not_found":
      return "We couldn't find that key. Double-check it and try again.";
    case "refunded":
      return "This license was refunded and is no longer active.";
    case "deactivated":
      return "This license has been deactivated.";
    case "activation_limit":
      return "This key has reached its device limit. Contact support to reset it.";
    default:
      return "That key isn't valid. Please try again.";
  }
}
