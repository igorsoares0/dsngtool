"use client";

interface WatermarkOpts {
  width: number;
  height: number;
  mimeType: string;
  quality?: number;
}

/**
 * Post-processes an exported data URL by drawing a watermark over it, instead
 * of mutating the live Konva stage. Returns a new data URL of the same size.
 * Free-tier exports use this; Pro skips it.
 */
export async function applyWatermark(
  dataUrl: string,
  { width, height, mimeType, quality }: WatermarkOpts
): Promise<string> {
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || width;
  canvas.height = img.naturalHeight || height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // canvas unsupported — fall back to original

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Scale the watermark to the image so it reads on both 1080px and small canvases.
  const pad = Math.round(canvas.width * 0.025);
  const fontSize = Math.max(14, Math.round(canvas.width * 0.032));
  const text = "Made with dsgntool";

  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  const x = canvas.width - pad;
  const y = canvas.height - pad;

  // Soft shadow so the mark stays legible on any background.
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = Math.round(fontSize * 0.4);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(text, x, y);

  return canvas.toDataURL(mimeType, quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
