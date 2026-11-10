"use client";

import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db, type LocalAsset } from "./db";
import type { Page } from "../types/editor";

/**
 * Images the user adds are kept in IndexedDB, not inside the design: an image
 * element's `src` is `asset:<id>`, and the bytes live once in `db.assets`.
 * That keeps autosave cheap (a project row stays a few KB however many photos
 * it holds) and lets one upload be reused across designs.
 *
 * Rendering needs a real URL, so `asset:` sources resolve to object URLs,
 * cached for the page lifetime. Object URLs are same-origin, so a canvas that
 * draws them can still be exported (no CORS taint).
 *
 * Everything else — bundled /assets files, data: URLs, and remote URLs in old
 * designs — passes through untouched.
 */

export const ASSET_SCHEME = "asset:";

export function isAssetSrc(src: string | undefined | null): src is string {
  return !!src && src.startsWith(ASSET_SCHEME);
}

export function assetIdOf(src: string): string {
  return src.slice(ASSET_SCHEME.length);
}

export function assetSrc(id: string): string {
  return ASSET_SCHEME + id;
}

const urls = new Map<string, Promise<string | null>>();

/** Resolve any image `src` to something an <img> can load, or null if the asset is gone. */
export function resolveSrc(src: string): Promise<string | null> {
  if (!isAssetSrc(src)) return Promise.resolve(src);
  const id = assetIdOf(src);
  let p = urls.get(id);
  if (!p) {
    p = db.assets
      .get(id)
      .then((a) => (a ? URL.createObjectURL(a.blob) : null))
      .catch(() => null);
    urls.set(id, p);
  }
  return p;
}

/**
 * React binding for `resolveSrc`. Non-asset sources resolve synchronously, so
 * templates and stock assets render on the first frame as before.
 */
export function useResolvedSrc(src: string): string | null {
  const local = isAssetSrc(src);
  const [resolved, setResolved] = useState<{ src: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!local) return;
    let alive = true;
    void resolveSrc(src).then((url) => {
      if (alive) setResolved({ src, url });
    });
    return () => {
      alive = false;
    };
  }, [src, local]);

  if (!local) return src;
  return resolved?.src === src ? resolved.url : null;
}

export function newAssetId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `a_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Store an image and return the `src` an element should use. */
export async function saveAsset(
  blob: Blob,
  meta: { name: string; w: number; h: number; id?: string }
): Promise<string> {
  const id = meta.id ?? newAssetId();
  const row: LocalAsset = {
    id,
    blob,
    name: meta.name,
    type: blob.type,
    size: blob.size,
    w: meta.w,
    h: meta.h,
    createdAt: new Date(),
  };
  await db.assets.put(row);
  requestPersistentStorage();
  return assetSrc(id);
}

export async function deleteAsset(id: string): Promise<void> {
  await db.assets.delete(id);
  const p = urls.get(id);
  urls.delete(id);
  const url = await p;
  if (url) URL.revokeObjectURL(url);
}

/** Every `asset:` id referenced by a set of pages. */
export function collectAssetIds(pages: Page[]): string[] {
  const ids = new Set<string>();
  for (const page of pages) {
    for (const el of page.elements) {
      if (el.type === "image" && isAssetSrc(el.src)) ids.add(assetIdOf(el.src));
    }
  }
  return [...ids];
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Decoded by hand rather than `fetch(dataUrl)`: the CSP's connect-src doesn't
 * list `data:`, so fetching one is blocked.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!m) throw new Error("not a data URL");
  const [, type, b64, body] = m;
  if (!b64) return new Blob([decodeURIComponent(body)], { type });
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Every stored image, newest first, kept live as uploads land or go. */
export function useLocalAssets(): LocalAsset[] | null {
  const [assets, setAssets] = useState<LocalAsset[] | null>(null);
  useEffect(() => {
    const sub = liveQuery(() => db.assets.orderBy("createdAt").reverse().toArray()).subscribe({
      next: setAssets,
      error: () => setAssets([]),
    });
    return () => sub.unsubscribe();
  }, []);
  return assets;
}

/** How many saved designs place this image. */
export async function countAssetUses(id: string): Promise<number> {
  const src = assetSrc(id);
  let n = 0;
  await db.projects.each((p) => {
    if (p.pages?.some((pg) => pg.elements.some((el) => el.type === "image" && el.src === src))) n++;
  });
  return n;
}

/**
 * Ask the browser not to evict our IndexedDB under storage pressure. Without
 * it, Safari in particular may clear a site's data after weeks of no visits —
 * and here that data is the user's only copy. Granted silently for installed
 * PWAs and frequently-used sites; a refusal changes nothing.
 */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    // unsupported
  }
}
