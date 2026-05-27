"use client";

const FORMATS: Record<string, { w: number; h: number }> = {
  "Instagram Post": { w: 1080, h: 1080 },
  "Instagram Story": { w: 1080, h: 1920 },
  Pinterest: { w: 1000, h: 1500 },
};

export default function CanvasArea({ format = "Instagram Post" }: { format?: string }) {
  const dims = FORMATS[format] || FORMATS["Instagram Post"];
  const aspect = dims.w / dims.h;

  return (
    <div className="flex-1 bg-surface-0 canvas-grid flex items-center justify-center overflow-hidden relative">
      {/* Vignette edges */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,#0c0c0c_100%)] opacity-60" />

      {/* Canvas artboard */}
      <div
        className="bg-white rounded-sm shadow-2xl shadow-black/50 animate-canvas-appear relative"
        style={{
          width: aspect >= 1 ? "min(55%, 500px)" : `calc(min(65%, 480px) * ${aspect})`,
          aspectRatio: `${dims.w} / ${dims.h}`,
        }}
      >
        {/* Inner placeholder content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 gap-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-zinc-400">
              {dims.w} × {dims.h}
            </p>
            <p className="text-[10px] text-zinc-300 mt-0.5">{format}</p>
          </div>
        </div>
      </div>

      {/* Bottom zoom/info bar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-2/80 backdrop-blur-sm border border-border-subtle rounded-full px-3 py-1.5">
        <span className="text-[10px] text-text-ghost">
          {dims.w} × {dims.h}
        </span>
      </div>
    </div>
  );
}
