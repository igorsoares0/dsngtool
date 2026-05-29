"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";

interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) {
    const m3 = /^#?([a-f\d]{3})$/i.exec(hex.trim());
    if (!m3) return null;
    const s = m3[1];
    return {
      r: parseInt(s[0] + s[0], 16),
      g: parseInt(s[1] + s[1], 16),
      b: parseInt(s[2] + s[2], 16),
    };
  }
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const sn = s / 100;
  const vn = v / 100;
  const c = vn * sn;
  const hp = (h / 60) % 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = vn - c;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

function hexToHsv(hex: string): HSV {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, v: 0 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

const PALETTE: string[] = [
  "#FFFFFF", "#E5E7EB", "#9CA3AF", "#4B5563", "#1F2937", "#000000",
  "#FEE2E2", "#FCA5A5", "#EF4444", "#B91C1C", "#7F1D1D", "#450A0A",
  "#FFEDD5", "#FDBA74", "#F97316", "#C2410C", "#7C2D12", "#431407",
  "#FEF3C7", "#FCD34D", "#EAB308", "#A16207", "#713F12", "#422006",
  "#DCFCE7", "#86EFAC", "#22C55E", "#15803D", "#14532D", "#052E16",
  "#CCFBF1", "#5EEAD4", "#14B8A6", "#0F766E", "#134E4A", "#042F2E",
  "#DBEAFE", "#93C5FD", "#3B82F6", "#1D4ED8", "#1E3A8A", "#172554",
  "#EDE9FE", "#C4B5FD", "#8B5CF6", "#6D28D9", "#4C1D95", "#2E1065",
  "#FCE7F3", "#F9A8D4", "#EC4899", "#BE185D", "#831843", "#500724",
];

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  size?: "sm" | "md";
  align?: "left" | "right";
}

export default function ColorPicker({
  value,
  onChange,
  size = "md",
  align = "left",
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState<string>(value.toUpperCase());
  const lastEmittedRef = useRef(value.toLowerCase());
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  // Sync HSV from external value when it changes from outside
  useEffect(() => {
    if (value.toLowerCase() === lastEmittedRef.current) {
      setHexInput(value.toUpperCase());
      return;
    }
    const newHsv = hexToHsv(value);
    setHsv((prev) => ({
      h: newHsv.s === 0 ? prev.h : newHsv.h,
      s: newHsv.s,
      v: newHsv.v,
    }));
    setHexInput(value.toUpperCase());
    lastEmittedRef.current = value.toLowerCase();
  }, [value]);

  const emit = useCallback(
    (next: HSV) => {
      setHsv(next);
      const hex = hsvToHex(next.h, next.s, next.v);
      lastEmittedRef.current = hex.toLowerCase();
      setHexInput(hex);
      onChange(hex);
    },
    [onChange]
  );

  // Position popover via fixed coords (escapes overflow-clipped panel)
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 248;
    const popoverHeight = 360;
    let left = align === "right"
      ? rect.left
      : rect.right - popoverWidth;
    let top = rect.bottom + 6;
    // Flip if overflow viewport
    if (top + popoverHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - popoverHeight - 6);
    }
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) left = 8;
    setPos({ left, top });
  }, [open, align]);

  // Click outside / Escape closes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSvFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const sx = clamp((clientX - rect.left) / rect.width, 0, 1);
      const sy = clamp((clientY - rect.top) / rect.height, 0, 1);
      emit({ h: hsv.h, s: sx * 100, v: (1 - sy) * 100 });
    },
    [emit, hsv.h]
  );

  const handleHueFromEvent = useCallback(
    (clientY: number) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const sy = clamp((clientY - rect.top) / rect.height, 0, 1);
      emit({ h: sy * 360, s: hsv.s, v: hsv.v });
    },
    [emit, hsv.s, hsv.v]
  );

  const startDrag = (kind: "sv" | "hue") => (e: React.PointerEvent) => {
    e.preventDefault();
    if (kind === "sv") handleSvFromEvent(e.clientX, e.clientY);
    else handleHueFromEvent(e.clientY);
    const onMove = (ev: PointerEvent) => {
      if (kind === "sv") handleSvFromEvent(ev.clientX, ev.clientY);
      else handleHueFromEvent(ev.clientY);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const commitHex = (raw: string) => {
    const trimmed = raw.trim();
    const rgb = hexToRgb(trimmed);
    if (rgb) {
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      emit(rgbToHsv(rgb.r, rgb.g, rgb.b));
      setHexInput(hex);
    } else {
      setHexInput(value.toUpperCase());
    }
  };

  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Pick color"
        aria-expanded={open}
        className={`${dim} rounded-md border border-border-default cursor-pointer shrink-0 transition-shadow hover:shadow-md`}
        style={{ backgroundColor: value }}
      />
      {open && (
        <div
          ref={popoverRef}
          className="fixed z-[200] w-[248px] bg-surface-1 border border-border-default rounded-lg shadow-2xl p-3 animate-fade-in"
          style={{ left: pos.left, top: pos.top }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* SV square + hue slider */}
          <div className="flex gap-2">
            <div
              ref={svRef}
              onPointerDown={startDrag("sv")}
              className="relative flex-1 h-[140px] rounded-md overflow-hidden cursor-crosshair touch-none select-none"
              style={{
                backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                backgroundImage:
                  "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
              }}
            >
              <div
                className="absolute w-3 h-3 rounded-full border-2 border-white shadow pointer-events-none"
                style={{
                  left: `calc(${hsv.s}% - 6px)`,
                  top: `calc(${100 - hsv.v}% - 6px)`,
                  backgroundColor: hsvToHex(hsv.h, hsv.s, hsv.v),
                }}
              />
            </div>
            <div
              ref={hueRef}
              onPointerDown={startDrag("hue")}
              className="relative w-3 h-[140px] rounded-md overflow-hidden cursor-pointer touch-none select-none"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
              }}
            >
              <div
                className="absolute left-[-2px] right-[-2px] h-1 border border-white shadow pointer-events-none"
                style={{ top: `calc(${(hsv.h / 360) * 100}% - 2px)` }}
              />
            </div>
          </div>

          {/* Hex input + preview */}
          <div className="flex items-center gap-2 mt-3">
            <div
              className="w-7 h-7 rounded-md border border-border-subtle shrink-0"
              style={{ backgroundColor: hexInput }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value.toUpperCase())}
              onBlur={(e) => commitHex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commitHex((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              spellCheck={false}
              className="flex-1 bg-surface-2 border border-border-subtle text-xs text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent-green/40 font-mono uppercase"
            />
          </div>

          {/* Palette */}
          <div className="grid grid-cols-9 gap-1 mt-3">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => commitHex(c)}
                aria-label={c}
                className={`aspect-square rounded border transition-transform hover:scale-110 ${
                  value.toLowerCase() === c.toLowerCase()
                    ? "border-accent-green"
                    : "border-border-subtle"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
