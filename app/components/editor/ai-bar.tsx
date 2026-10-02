"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editor-store";
import { useEntitlementStore } from "../../store/entitlement-store";
import { TEMPLATES } from "../../data/templates";
import { FONT_FAMILY_NAMES } from "../../lib/font-catalog";
import { applyGeneration } from "../../lib/ai/manifest";
import type { GenerationResult } from "../../lib/ai/manifest";
import { fitTextToBox } from "../../lib/text-fit";
import { toast } from "../../store/toast-store";
import { BRIEF_HANDOFF_KEY } from "../../lib/brief-handoff";
import { ArrowRightIcon } from "./icons";
import { cx } from "../ui/cx";
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

type Status = "idle" | "generating" | "done";

const DONE_MS = 6000;

function resetLabel(iso: string | undefined): string {
  if (!iso) return "next month";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "next month";
  return d.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * The AI entry point, docked under the canvas: BRIEF tag · prompt · quota ·
 * action. ⌘K focuses it from anywhere, Enter generates, Esc cancels.
 *
 * States: idle → typing (has text) → generating → done (Undo) — or limit, when
 * the month's quota is spent. Cancel aborts the request client-side only; the
 * server may still finish and count the generation.
 */
export default function AiBar() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [appliedPage, setAppliedPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const undoNameRef = useRef<string | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTemplate = useEditorStore((s) => s.loadTemplate);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const openUpgrade = useEntitlementStore((s) => s.openModal);
  const ai = useEntitlementStore((s) => s.ai);
  const setAiRemaining = useEntitlementStore((s) => s.setAiRemaining);

  const left = ai ? Math.max(0, ai.limit - ai.used) : null;
  const atLimit = left === 0 && status !== "generating";
  const typing = status === "idle" && prompt.trim().length > 0;

  const clearDone = useCallback(() => {
    if (doneTimer.current) clearTimeout(doneTimer.current);
    doneTimer.current = null;
    setStatus((s) => (s === "done" ? "idle" : s));
  }, []);

  const generate = useCallback(
    async (briefOverride?: string) => {
      const brief = (briefOverride ?? prompt).trim();
      if (!brief || status === "generating") return;
      if (left === 0) {
        openUpgrade(`You've used all ${ai?.limit ?? ""} AI briefs this month. Upgrade for more.`);
        return;
      }

      clearDone();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("generating");
      let succeeded = false;

      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: brief }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (res.status === 402) {
          if (typeof data.limit === "number") setAiRemaining(0, data.limit);
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

        const merged = applyGeneration(template, data.result as GenerationResult, FONT_FAMILIES);

        // Fit pass: the model works to a character budget and a scale multiplier,
        // neither of which knows about pixels — and a font swap changes the
        // metrics again. Measure with the real engine, then shrink and re-anchor
        // anything that no longer fits the box the template gave it.
        const elements = merged.elements.map((el) =>
          el.type === "text"
            ? { ...el, ...(fitTextToBox(el as Omit<TextElement, "id">, merged.format) ?? {}) }
            : el
        );

        const state = useEditorStore.getState();
        undoNameRef.current = state.projectName;
        setAppliedPage(Math.max(1, state.pages.findIndex((p) => p.id === state.activePageId) + 1));

        loadTemplate({
          elements,
          backgroundColor: merged.backgroundColor,
          backgroundGradient: merged.backgroundGradient,
          format: merged.format,
        });
        setProjectName(merged.name);
        setPrompt("");
        succeeded = true;

        if (typeof data.remaining === "number" && typeof data.limit === "number") {
          setAiRemaining(data.remaining, data.limit);
        }

        // A partial response still yields a design — say what fell back rather
        // than reporting a clean generation.
        if (merged.degraded.length > 0) {
          toast.show({
            type: "info",
            message: `Generated from “${template.name}”`,
            sub: `${merged.degraded.join(" and ")} kept from the template`.toUpperCase(),
          });
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        toast.error("Couldn't reach the server. Check your connection.");
      } finally {
        abortRef.current = null;
        if (succeeded) {
          setStatus("done");
          doneTimer.current = setTimeout(() => setStatus("idle"), DONE_MS);
        } else {
          setStatus("idle");
        }
      }
    },
    [prompt, status, left, ai?.limit, openUpgrade, clearDone, loadTemplate, setProjectName, setAiRemaining]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const undoGeneration = useCallback(() => {
    useEditorStore.getState().undo();
    if (undoNameRef.current !== null) setProjectName(undoNameRef.current);
    undoNameRef.current = null;
    clearDone();
  }, [clearDone, setProjectName]);

  // ⌘K / Ctrl+K focuses the bar from anywhere; Esc cancels a running brief.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (e.key === "Escape" && abortRef.current) {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel]);

  // Brief handed over from the dashboard: run it once the editor is up.
  const handoffDone = useRef(false);
  useEffect(() => {
    if (handoffDone.current) return;
    handoffDone.current = true;
    let brief: string | null = null;
    try {
      brief = sessionStorage.getItem(BRIEF_HANDOFF_KEY);
      sessionStorage.removeItem(BRIEF_HANDOFF_KEY);
    } catch {
      // storage blocked — nothing to hand over
    }
    if (brief) {
      setPrompt(brief);
      void generate(brief);
    }
    // Mount-only by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (doneTimer.current) clearTimeout(doneTimer.current);
  }, []);

  // --- Presentation per state -------------------------------------------
  let tag = "BRIEF";
  let tagClass = "bg-ai text-ai-fg";
  if (status === "done") {
    tag = "✓ DONE";
    tagClass = "bg-success text-white";
  } else if (atLimit) {
    tag = "0 LEFT";
    tagClass = "bg-surface-3 text-text-secondary";
  }

  const quota =
    status === "generating"
      ? "USING 1"
      : atLimit && ai
        ? `${ai.limit} / ${ai.limit}`
        : left !== null
          ? `${left} LEFT`
          : null;

  const showInput = status !== "generating" && status !== "done" && !atLimit;

  return (
    <div className="h-10 shrink-0 flex items-stretch bg-surface-1 border-t border-border-default">
      <div
        className={cx(
          "flex items-center px-4 text-[12px] font-black font-wide tracking-[0.06em] shrink-0",
          tagClass
        )}
      >
        {tag}
      </div>

      <div className="relative flex-1 min-w-0 flex items-center px-4 overflow-hidden">
        {showInput ? (
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void generate();
              } else if (e.key === "Escape") {
                e.currentTarget.blur();
              }
            }}
            maxLength={600}
            aria-label="Describe a post for the AI to generate"
            placeholder="Describe a post — “poster for a ceramics fair, warm and minimal”"
            className="w-full bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary outline-none"
          />
        ) : (
          <span
            className={cx(
              "truncate text-[13.5px]",
              atLimit ? "text-text-secondary" : "text-text-primary"
            )}
            aria-live="polite"
          >
            {status === "generating"
              ? "Picking a template · writing the copy…"
              : status === "done"
                ? `Applied to page ${appliedPage}. Not quite right? Try again with more detail.`
                : `You’ve used all ${ai?.limit ?? ""} briefs this month. They reset on ${resetLabel(ai?.resetsAt)}.`}
          </span>
        )}
        {status === "generating" && (
          <span aria-hidden className="absolute left-0 bottom-0 h-[2px] w-full overflow-hidden">
            <span className="block h-full w-1/3 bg-ai animate-ai-progress" />
          </span>
        )}
      </div>

      {quota && (
        <div
          className={cx(
            "flex items-center px-3.5 font-mono text-[10.5px] border-l border-border-default shrink-0",
            status === "generating"
              ? "text-text-primary"
              : atLimit
                ? "text-danger"
                : "text-text-tertiary"
          )}
          title="AI briefs this month"
        >
          {quota}
        </div>
      )}

      {status === "generating" ? (
        <button
          type="button"
          onClick={cancel}
          className="flex items-center px-3.5 text-[12px] font-bold text-text-secondary hover:text-text-primary border-l border-border-default shrink-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          CANCEL
        </button>
      ) : status === "done" ? (
        <button
          type="button"
          onClick={undoGeneration}
          className="flex items-center px-3.5 text-[12px] font-bold text-text-primary hover:bg-surface-3 border-l border-border-default shrink-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          UNDO <span className="ml-1.5 font-mono font-medium text-[10.5px]">⌘Z</span>
        </button>
      ) : atLimit ? (
        <button
          type="button"
          onClick={() => openUpgrade("Upgrade for 100 AI briefs a month.")}
          className="flex items-center px-3.5 text-[12px] font-extrabold font-expanded uppercase tracking-[0.02em] bg-accent text-accent-fg hover:bg-accent-hover shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
        >
          Go Pro · 100/mo
        </button>
      ) : typing ? (
        <button
          type="button"
          onClick={() => void generate()}
          className="flex items-center px-3.5 text-[12px] font-bold bg-surface-inverse text-text-inverse shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
        >
          GENERATE ⏎
        </button>
      ) : (
        <>
          <div className="hidden sm:flex items-center px-3 font-mono text-[10.5px] font-medium text-text-secondary border-l border-border-default shrink-0">
            ⌘K
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.focus()}
            aria-label="Focus the brief"
            className="w-10 flex items-center justify-center bg-surface-inverse text-text-inverse shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
          >
            <ArrowRightIcon className="w-[15px] h-[15px]" />
          </button>
        </>
      )}
    </div>
  );
}
