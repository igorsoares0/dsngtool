"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editor-store";
import { useEntitlementStore } from "../../store/entitlement-store";
import { TEMPLATES } from "../../data/templates";
import { FONT_FAMILY_NAMES } from "../../lib/font-catalog";
import { applyGeneration } from "../../lib/ai/manifest";
import type { GenerationResult } from "../../lib/ai/manifest";
import { fitTextToBox } from "../../lib/text-fit";
import { toast } from "../../store/toast-store";
import { SparkleIcon } from "./icons";
import type { TextElement } from "../../types/editor";

const FONT_FAMILIES = FONT_FAMILY_NAMES;

const ERRORS: Record<string, string> = {
  not_configured: "AI generation isn't configured on this server.",
  rate_limited: "The AI service is busy. Try again in a moment.",
  refused: "The model declined this brief. Try rephrasing it.",
  upstream: "The AI service failed. Your credit wasn't used.",
  prompt_too_long: "That brief is too long — keep it under 600 characters.",
  unauthorized: "Your session expired. Sign in again to use AI.",
};

/**
 * The AI entry point: a single floating bar over the canvas, replacing the old
 * sidebar panel. `focusSignal` increments when the rail's AI button is pressed —
 * there is no panel to open any more, so it focuses the input instead.
 */
export default function AiBar({ focusSignal }: { focusSignal: number }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTemplate = useEditorStore((s) => s.loadTemplate);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const openLicense = useEntitlementStore((s) => s.openModal);

  useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus();
  }, [focusSignal]);

  async function generate() {
    const brief = prompt.trim();
    if (!brief || busy) return;

    // Quota is known only after the first generation. Once it's spent, don't
    // spend a round trip to be told no.
    if (remaining === 0) {
      openLicense(
        limit === null
          ? "You've used all your AI generations this month. Upgrade for more."
          : `You've used all ${limit} AI generations this month. Upgrade for more.`
      );
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: brief }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setRemaining(0);
        if (typeof data.limit === "number") setLimit(data.limit);
        openLicense(
          `You've used all ${data.limit} AI generations this month. Upgrade for more.`
        );
        return;
      }
      if (!res.ok) {
        toast.error(ERRORS[data.error] ?? "Generation failed. Try again.");
        return;
      }

      const template = TEMPLATES.find((t) => t.name === data.template);
      if (!template) {
        toast.error("Generation failed. Try again.");
        return;
      }

      const merged = applyGeneration(
        template,
        data.result as GenerationResult,
        FONT_FAMILIES
      );

      // Fit pass: the model works to a character budget and a scale multiplier,
      // neither of which knows about pixels — and a font swap changes the
      // metrics again. Measure with the real engine, then shrink and re-anchor
      // anything that no longer fits the box the template gave it.
      const elements = merged.elements.map((el) =>
        el.type === "text"
          ? { ...el, ...(fitTextToBox(el as Omit<TextElement, "id">, merged.format) ?? {}) }
          : el
      );

      loadTemplate({
        elements,
        backgroundColor: merged.backgroundColor,
        backgroundGradient: merged.backgroundGradient,
        format: merged.format,
      });
      setProjectName(merged.name);
      setPrompt("");

      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.limit === "number") setLimit(data.limit);

      // A partial response still yields a design — say what fell back rather
      // than reporting a clean generation.
      if (merged.degraded.length > 0) {
        toast.info(
          `Generated from "${template.name}" — ${merged.degraded.join(" and ")} kept from the template.`
        );
      } else {
        toast.success(`Generated from "${template.name}"`);
      }
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const quota =
    remaining !== null && limit !== null ? `${limit - remaining}/${limit}` : null;

  return (
    <div className="absolute bottom-[calc(45vh+1rem)] lg:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[330px] max-w-[calc(100%-2rem)]">
      <div className="flex items-center gap-2 h-11 pl-3.5 pr-1.5 bg-surface-2 border border-border-default rounded-full shadow-[0_6px_20px_rgb(0_0_0/.10)] dark:shadow-[0_6px_20px_rgb(0_0_0/.5)]">
        <SparkleIcon className="w-4 h-4 text-accent shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              generate();
            }
          }}
          maxLength={600}
          disabled={busy}
          aria-label="Describe a post for the AI to generate"
          placeholder={busy ? "Generating…" : "Describe a post…"}
          className="flex-1 min-w-0 bg-transparent text-[11.5px] text-text-primary placeholder:text-text-ghost outline-none disabled:opacity-60"
        />

        {quota && (
          <span
            className="text-[11px] font-mono tabular-nums text-text-tertiary shrink-0"
            title="AI generations used this month"
          >
            {quota}
          </span>
        )}

        <button
          onClick={generate}
          disabled={busy || !prompt.trim()}
          aria-label="Generate design"
          className="w-[26px] h-[26px] rounded-full bg-accent text-accent-fg flex items-center justify-center shrink-0 hover:bg-accent-hover disabled:opacity-35 disabled:pointer-events-none transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {busy ? (
            <span className="w-3 h-3 border-2 border-accent-fg border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUpIcon className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
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
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
