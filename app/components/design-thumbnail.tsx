"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CanvasFormat, EditorElement, GradientFill, Page } from "../types/editor";
import { resolveFontFamily } from "../lib/fonts";

/**
 * A live preview of a design, drawn as SVG straight from the stored document.
 *
 * Deliberately not a stored raster: `/api/projects` already ships the full
 * document to the client, so rendering from it costs no storage, needs no
 * upload, and can never go stale against the design it claims to show. It also
 * keeps Konva out of the dashboard bundle.
 *
 * It is a preview, not a second renderer — image filters and drop shadows are
 * skipped, and everything else (geometry, gradients, fonts, alignment, wrapping)
 * follows what the canvas does.
 */

/** Konva's `fontStyle` is a single string ("bold", "italic bold"); SVG wants two. */
function splitFontStyle(style: string | undefined): { weight: string; style: string } {
  const s = style || "";
  return {
    weight: s.includes("bold") ? "bold" : "normal",
    style: s.includes("italic") ? "italic" : "normal",
  };
}

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string): number {
  if (typeof document === "undefined") return 0;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

/**
 * Split into rendered lines. Explicit-width boxes wrap the way the canvas wraps
 * them; auto-width boxes hug their text and only break where the author did.
 */
function toLines(el: Extract<EditorElement, { type: "text" }>, font: string): string[] {
  const raw = el.textTransform === "uppercase" ? el.text.toUpperCase() : el.text;
  const paragraphs = raw.split("\n");
  if (el.autoWidth !== false) return paragraphs;

  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate, font) > el.width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Re-render once webfonts arrive. The SVG below is what *causes* them to load
 * (they are declared but not preloaded), so the first paint measures with
 * fallback metrics and would keep stale line breaks without this.
 */
function useFontTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const bump = () => setTick((n) => n + 1);
    document.fonts.ready.then(bump);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  return tick;
}

function GradientDef({ id, g, width, height }: { id: string; g: GradientFill; width: number; height: number }) {
  const stops: React.ReactNode[] = [];
  for (let i = 0; i < g.colorStops.length; i += 2) {
    const offset = g.colorStops[i];
    const color = g.colorStops[i + 1];
    if (typeof offset !== "number" || typeof color !== "string") continue;
    stops.push(<stop key={i} offset={offset} stopColor={color} />);
  }
  if (g.type === "radial") {
    const maxDim = Math.max(width, height);
    return (
      <radialGradient
        id={id}
        gradientUnits="userSpaceOnUse"
        cx={g.startX * width}
        cy={g.startY * height}
        r={(g.endRadius ?? 0.7) * maxDim}
      >
        {stops}
      </radialGradient>
    );
  }
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={g.startX * width}
      y1={g.startY * height}
      x2={g.endX * width}
      y2={g.endY * height}
    >
      {stops}
    </linearGradient>
  );
}

function ElementNode({ el, uid }: { el: EditorElement; uid: string }) {
  // Konva rotates around the element's own origin, which is its top-left.
  const spin = el.rotation ? { transform: `rotate(${el.rotation} ${el.x} ${el.y})` } : {};
  const common = { opacity: el.opacity, ...spin };

  if (el.type === "shape") {
    const gradId = `${uid}-g-${el.id}`;
    const fill = el.gradient ? `url(#${gradId})` : el.fill;
    const stroke = el.stroke && el.strokeWidth ? el.stroke : undefined;
    const strokeWidth = el.strokeWidth || 0;
    const defs = el.gradient ? (
      <defs>
        <GradientDef id={gradId} g={el.gradient} width={el.width} height={el.height} />
      </defs>
    ) : null;

    if (el.shapeType === "ellipse") {
      return (
        <g {...common}>
          {defs}
          <ellipse
            cx={el.x + el.width / 2}
            cy={el.y + el.height / 2}
            rx={el.width / 2}
            ry={el.height / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );
    }
    if (el.shapeType === "triangle") {
      const pts = [
        `${el.x + el.width / 2},${el.y}`,
        `${el.x + el.width},${el.y + el.height}`,
        `${el.x},${el.y + el.height}`,
      ].join(" ");
      return (
        <g {...common}>
          {defs}
          <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    }
    if (el.shapeType === "line") {
      return (
        <g {...common}>
          <line
            x1={el.x}
            y1={el.y + el.height / 2}
            x2={el.x + el.width}
            y2={el.y + el.height / 2}
            stroke={el.stroke || "#000000"}
            strokeWidth={el.strokeWidth || 4}
            strokeLinecap="round"
          />
        </g>
      );
    }
    return (
      <g {...common}>
        {defs}
        <rect
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          rx={el.cornerRadius || 0}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </g>
    );
  }

  if (el.type === "image") {
    const clipId = `${uid}-c-${el.id}`;
    const flip = `${el.flipX ? `translate(${2 * el.x + el.width} 0) scale(-1 1)` : ""} ${
      el.flipY ? `translate(0 ${2 * el.y + el.height}) scale(1 -1)` : ""
    }`.trim();
    return (
      <g {...common} transform={[spin.transform, flip].filter(Boolean).join(" ") || undefined}>
        {el.cornerRadius ? (
          <defs>
            <clipPath id={clipId}>
              <rect
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                rx={el.cornerRadius}
              />
            </clipPath>
          </defs>
        ) : null}
        <image
          href={el.src}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          preserveAspectRatio="none"
          clipPath={el.cornerRadius ? `url(#${clipId})` : undefined}
        />
      </g>
    );
  }

  const { weight, style } = splitFontStyle(el.fontStyle);
  const family = resolveFontFamily(el.fontFamily);
  const font = `${style} ${weight} ${el.fontSize}px ${family}`;
  const lines = toLines(el, font);
  const lineHeight = (el.lineHeight || 1.2) * el.fontSize;
  const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
  const anchorX =
    el.align === "center"
      ? el.x + el.width / 2
      : el.align === "right"
        ? el.x + el.width
        : el.x;

  return (
    <g {...common}>
      <text
        fontFamily={family}
        fontSize={el.fontSize}
        fontWeight={weight}
        fontStyle={style}
        fill={el.fill}
        textAnchor={anchor}
        letterSpacing={el.letterSpacing || undefined}
        textDecoration={el.textDecoration || undefined}
      >
        {lines.map((line, i) => (
          <tspan
            key={i}
            x={anchorX}
            y={el.y + i * lineHeight}
            dominantBaseline="text-before-edge"
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/**
 * Hold off drawing until the card is near the viewport. A grid can hold every
 * one of an account's projects (200 of them), and each image element in a
 * design is its own network request — rendering the whole grid up front would
 * fire all of them at once.
 */
function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  // Lazily initialised rather than defaulted to false: where there is no
  // IntersectionObserver (any non-browser render) there is also nothing to
  // observe, so the design has to be drawn on the first pass or never.
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [near]);

  return { ref, near };
}

export default function DesignThumbnail({
  pages,
  format,
  className,
}: {
  pages: Page[];
  format: CanvasFormat;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  useFontTick();
  const { ref, near } = useNearViewport<HTMLDivElement>();

  const page = pages[0];
  if (!page || !format?.width || !format?.height) return null;

  const bgId = `${uid}-bg`;

  if (!near) {
    return (
      <div
        ref={ref}
        className={className}
        style={{ backgroundColor: page.backgroundColor }}
      />
    );
  }

  return (
    <div ref={ref} className={className}>
    <svg
      className="w-full h-full block"
      viewBox={`0 0 ${format.width} ${format.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
    >
      {page.backgroundGradient && (
        <defs>
          <GradientDef
            id={bgId}
            g={page.backgroundGradient}
            width={format.width}
            height={format.height}
          />
        </defs>
      )}
      <rect
        x={0}
        y={0}
        width={format.width}
        height={format.height}
        fill={page.backgroundGradient ? `url(#${bgId})` : page.backgroundColor}
      />
      {page.elements
        .filter((el) => !el.hidden)
        .map((el) => (
          <ElementNode key={el.id} el={el} uid={uid} />
        ))}
    </svg>
    </div>
  );
}
