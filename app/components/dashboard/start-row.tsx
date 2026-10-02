"use client";

import { forwardRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BRIEF_HANDOFF_KEY } from "../../lib/brief-handoff";
import { FORMAT_SLUGS, type FormatSlug } from "../../types/editor";
import type { AiUsage } from "../../lib/ai-limits";
import { cx } from "../ui/cx";

const STARTS: { slug: FormatSlug; name: string; glyph: string }[] = [
  { slug: "post", name: "Post", glyph: "w-10 h-10" },
  { slug: "story", name: "Story", glyph: "w-[26px] h-[46px]" },
  { slug: "pinterest", name: "Pinterest", glyph: "w-8 h-[46px]" },
];

/** A blank design at one of the presets: ratio glyph, name, mono size. */
export function FormatCard({ slug, compact }: { slug: FormatSlug; compact?: boolean }) {
  const s = STARTS.find((x) => x.slug === slug)!;
  const f = FORMAT_SLUGS[slug];
  return (
    <a
      href={`/?new=1&format=${slug}`}
      className={cx(
        "flex flex-col justify-between bg-surface-1 shadow-[inset_0_0_0_1px_var(--border-default)] text-text-primary transition-shadow",
        "hover:shadow-[inset_0_0_0_1px_var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
        compact ? "w-[130px] h-[120px] p-3" : "h-[132px] p-3.5"
      )}
    >
      <span className={cx("block shadow-[inset_0_0_0_1.5px_var(--text-primary)]", s.glyph)} aria-hidden />
      <span className="flex flex-col">
        <span className={cx("font-extrabold", compact ? "text-[14px]" : "text-[15px]")} style={{ fontStretch: "110%" }}>
          {s.name}
        </span>
        <span className="font-mono text-[10.5px] text-text-tertiary">
          {f.width} × {f.height}
        </span>
      </span>
    </a>
  );
}

/**
 * The dashboard's AI entry. Generation needs the editor (its fit pass measures
 * text with Konva), so this hands the brief over and opens a new design; the
 * editor's brief bar picks it up and runs it.
 */
export const BriefCard = forwardRef<HTMLInputElement, { ai: AiUsage | null; empty?: boolean }>(
  function BriefCard({ ai, empty }, ref) {
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const left = ai ? Math.max(0, ai.limit - ai.used) : null;

    const submit = () => {
      const brief = prompt.trim();
      if (!brief) return;
      try {
        sessionStorage.setItem(BRIEF_HANDOFF_KEY, brief);
      } catch {
        // storage blocked — the editor opens blank instead
      }
      router.push("/?new=1");
    };

    const quota =
      left === null
        ? ""
        : empty && ai && ai.used === 0
          ? `${ai.limit} FREE THIS MONTH`
          : `${left} OF ${ai?.limit} LEFT THIS MONTH`;

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cx(
          "bg-surface-1 shadow-[inset_0_0_0_1px_var(--border-default)] flex flex-col justify-between gap-3",
          empty ? "p-4" : "h-[132px] px-[18px] py-4"
        )}
      >
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-[13px] font-black tracking-[0.06em]" style={{ fontStretch: "120%" }}>
            <span className="bg-ai text-ai-fg px-1.5 py-0.5">BRIEF</span>
            {!empty && <span className="ml-2">Or just describe it</span>}
          </span>
          {!empty && <span className="font-mono text-[10.5px] text-text-tertiary">{quota}</span>}
        </div>
        <div className="flex items-stretch h-[42px] border-b-[1.5px] border-text-primary focus-within:border-selection">
          <input
            ref={ref}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={600}
            aria-label="Describe a post for the AI to generate"
            placeholder={
              empty
                ? "“An opening-day post for my bakery, warm and simple”"
                : "A launch post for my candle shop, autumn colours"
            }
            className="flex-1 min-w-0 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary outline-none"
          />
          {!empty && (
            <button
              type="submit"
              disabled={!prompt.trim() || left === 0}
              className="self-center mb-1.5 px-3.5 py-1.5 bg-surface-inverse text-text-inverse text-[12.5px] font-bold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
            >
              Generate ⏎
            </button>
          )}
        </div>
        {empty && (
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10.5px] text-text-tertiary">{quota}</span>
            <button
              type="submit"
              disabled={!prompt.trim() || left === 0}
              className="px-3 py-[7px] bg-surface-inverse text-text-inverse text-[12.5px] font-bold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
            >
              Generate ⏎
            </button>
          </div>
        )}
      </form>
    );
  }
);
