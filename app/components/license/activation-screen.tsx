"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLicenseStore, type ActivateResult } from "../../store/license-store";
import { openLtdCheckout, pollLicenseForTransaction } from "../../lib/paddle-checkout";
import { TEMPLATES } from "../../data/templates";
import { btnPrimary, btnSecondary } from "../ui/buttons";
import { cx } from "../ui/cx";
import LicenseCollage from "./collage";

const RESULT_MESSAGES: Record<Exclude<ActivateResult, "ok">, string> = {
  invalid: "That key isn't valid. Copy it again from your purchase email, all of it.",
  revoked: "This license was refunded or deactivated, so it no longer unlocks Modo.",
};

/** Errors handed over in the URL by /activate and the AppSumo redeem route. */
export const URL_ERRORS: Record<string, string> = {
  revoked: RESULT_MESSAGES.revoked,
  appsumo:
    "We couldn't finish activating your AppSumo license. Try the Activate button on AppSumo again, or contact support.",
};

const PRICE_LABEL = process.env.NEXT_PUBLIC_LTD_PRICE_LABEL;

function Note({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cx(
        "text-[13px] leading-[1.45] border-l-[3px] px-3 py-2.5 text-text-primary",
        kind === "error" ? "bg-danger-tint border-danger" : "bg-surface-3 border-success"
      )}
    >
      {children}
    </div>
  );
}

/**
 * Full-screen activation: the only thing a device without a license sees.
 * Paste a key, buy one (Paddle → the webhook mints it → we poll it in), or
 * follow the AppSumo route, which lands back here already activated.
 */
export default function ActivationScreen({
  initialError,
  initialKey,
}: {
  initialError?: string | null;
  /** A key from an /activate#key= link; activated on mount. */
  initialKey?: string | null;
}) {
  const activate = useLicenseStore((s) => s.activate);
  const fieldId = useId();
  const [keyInput, setKeyInput] = useState(initialKey ?? "");
  const [pending, setPending] = useState<"activate" | "buy" | null>(initialKey ? "activate" : null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const autoRan = useRef(false);

  const submit = async (raw: string) => {
    if (!raw.trim()) return;
    setPending("activate");
    setError(null);
    const result = await activate(raw);
    // On success the gate swaps this screen out; nothing else to do.
    if (result !== "ok") {
      setError(RESULT_MESSAGES[result]);
      setPending(null);
    }
  };

  useEffect(() => {
    if (!initialKey || autoRan.current) return;
    autoRan.current = true;
    void submit(initialKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const buy = async () => {
    setPending("buy");
    setError(null);
    setInfo(null);
    try {
      const { transactionId } = await openLtdCheckout();
      setInfo("Payment received. Activating your license…");
      const key = await pollLicenseForTransaction(transactionId);
      if (key) {
        setKeyInput(key);
        await submit(key);
        return;
      }
      setInfo(null);
      setError("Payment received. Your key is on its way by email; paste it here when it arrives.");
    } catch (e) {
      if ((e as Error)?.message !== "closed") setError("Checkout couldn't start. Try again in a moment.");
    }
    setPending(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-0 text-text-primary">
      <div className="min-h-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_560px]">
        <div className="hidden md:flex flex-col justify-between px-12 py-10 border-r border-border-default overflow-hidden">
          <span className="self-start text-[22px] font-black font-wide tracking-[-0.02em]">
            modo<span className="text-accent">.</span>
          </span>
          <LicenseCollage />
          <span className="font-mono text-[11px] text-text-tertiary">
            FIG. 2 — TWO OF {TEMPLATES.length} STARTING POINTS
          </span>
        </div>

        <div className="bg-surface-1 flex flex-col justify-center px-6 sm:px-[72px] py-10">
          <span className="md:hidden mb-8 text-[22px] font-black font-wide tracking-[-0.02em]">
            modo<span className="text-accent">.</span>
          </span>

          <div className="w-full flex flex-col gap-[26px]">
            <div className="flex flex-col gap-2.5">
              <h1
                className="text-[36px] sm:text-[44px] leading-[0.92] font-black tracking-[-0.03em]"
                style={{ fontStretch: "122%" }}
              >
                Activate Modo
              </h1>
              <p className="text-[14px] text-text-secondary leading-relaxed">
                Paste the license key from your purchase email. Activation happens on this device;
                your designs never leave it.
              </p>
            </div>

            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(keyInput);
              }}
            >
              <div className="flex flex-col gap-[5px]">
                <label htmlFor={fieldId} className="font-mono text-[10.5px] font-medium uppercase text-text-secondary">
                  License key
                </label>
                <textarea
                  id={fieldId}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit(keyInput);
                    }
                  }}
                  rows={3}
                  placeholder="MODO-…"
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="characters"
                  aria-invalid={error ? true : undefined}
                  className={cx(
                    "w-full resize-none px-3 py-2.5 bg-surface-0 font-mono text-[12.5px] leading-[1.5] break-all text-text-primary placeholder:text-text-ghost outline-none transition-shadow",
                    error
                      ? "shadow-[inset_0_0_0_1.5px_var(--danger)]"
                      : "shadow-[inset_0_0_0_1px_var(--border-default)] focus:bg-surface-1 focus:shadow-[inset_0_0_0_1.5px_var(--selection)]"
                  )}
                />
              </div>
              <Note kind="error">{error}</Note>
              <Note kind="success">{info}</Note>
              <button
                type="submit"
                disabled={pending !== null || !keyInput.trim()}
                className={cx(btnPrimary, "h-12 mt-1 text-[14px]")}
              >
                {pending === "activate" ? "Activating…" : "Activate"}
              </button>
            </form>

            <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase text-text-tertiary">
              <div className="h-px flex-1 bg-border-default" />
              No license yet?
              <div className="h-px flex-1 bg-border-default" />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={buy}
                disabled={pending !== null}
                className={cx(btnSecondary, "h-12 text-[14px]")}
              >
                {pending === "buy"
                  ? "Opening checkout…"
                  : `Buy a lifetime license${PRICE_LABEL ? ` — ${PRICE_LABEL}` : ""}`}
              </button>
              <p className="text-[12.5px] text-text-tertiary leading-relaxed">
                One payment, no subscription. AI generation uses your own Anthropic API key.
                Bought on AppSumo? Use the Activate button on your AppSumo product page and
                you&apos;ll land back here, already activated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
