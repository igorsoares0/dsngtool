# Modo — Technical Overview

Modo is a browser-based visual design editor for social media content — Instagram
posts and stories, Pinterest graphics, promo banners. It runs entirely in the
browser (installable as a PWA, works offline). There are no accounts: designs
and images live on the user's device, AI runs on the user's own Anthropic key,
and a one-time license key unlocks the app.

Positioning: a lighter, faster Canva. No install, no learning curve, a small
toolset that covers what people actually use.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Canvas | Konva / react-konva |
| State | Zustand |
| Styling | Tailwind CSS v4 (`:root`/`.dark` tokens aliased through `@theme inline` in `app/globals.css`) |
| Local storage | IndexedDB via Dexie |
| License server | PostgreSQL (Neon) via Prisma 7 + `@prisma/adapter-pg` — one `License` table |
| Licensing | Ed25519 keys (`@noble/ed25519`) verified on the device |
| AI | Anthropic SDK in the browser, user's own key (`claude-haiku-5-5` picks the template, `claude-sonnet-5-5` fills it) |
| Payments | Paddle (one-time) + AppSumo Licensing API |
| Email | Resend |
| Hosting | Coolify on Hetzner (`app.getmodo.pro`) |

---

## Application shape

```
app/
  page.tsx              → the editor, behind the license gate
  dashboard/            → projects + settings, behind the license gate
  activate/             → one-click activation links (/activate#key=…)
  api/
    webhooks/paddle     → one-time purchase → License + email; refunds revoke
    webhooks/appsumo    → AppSumo license lifecycle
    appsumo/redeem      → AppSumo OAuth redirect → /activate#key=…
    license/status      → "was this license refunded?" (daily, best-effort)
    license/by-transaction → key for a just-finished checkout
  components/editor/    → topbar, sidebar, panels, canvas, modals
  components/license/   → activation screen, gate
  components/settings/  → AI key, backup/restore, license, theme
  store/                → editor-store, license-store, settings-store, toast-store
  lib/                  → client libs (db, local-assets, backup, fonts, text-fit)
  lib/ai/               → manifest + browser-side generation
  lib/license/          → key format, signing, verification (isomorphic)
  lib/server/           → server-only (db, license, appsumo, paddle, email, rate-limit)
  data/                 → templates.ts (52 templates), assets.ts
```

---

## Editor engine

**Document model** (`app/types/editor.ts`). A project is a flat array of
elements plus a background and a format. Three element types share a
`BaseElement` (id, x, y, width, height, rotation, opacity, locked, hidden):

- `TextElement` — font family/size/style, align, transform, line height, letter
  spacing, shadow, and an `autoWidth` flag (auto-fit vs. explicit wrap width).
- `ImageElement` — src, flips, corner radius, and filters (blur, brightness,
  contrast, saturation, grayscale, sepia, invert).
- `ShapeElement` — rectangle / ellipse / triangle / line, fill or gradient,
  stroke, corner radius.

Formats are fixed presets: Instagram Post 1080×1080, Instagram Story 1080×1920,
Pinterest 1000×1500.

**State** (`app/store/editor-store.ts`). One Zustand store holds elements,
selection, viewport (zoom/pan), active tool, background, clipboard, and the
undo/redo stacks. History is snapshot-based: mutating actions push a
`{ elements, backgroundColor, backgroundGradient }` snapshot onto `past`.
Drag/transform loops use `updateElementSilent` so a gesture produces one history
entry, not one per frame.

**Rendering** (`canvas-stage.tsx`). A Konva `Stage` scaled to fit the viewport,
with selection transformer, snapping guides, multi-select, and a hand/space pan
tool. Keyboard shortcuts, clipboard (including paste-image-from-OS), and a
right-click context menu are wired through hooks in `app/hooks/`.

**Fonts** (`app/lib/fonts.ts`). 28 design families are bundled at build time via
`next/font/google`, so they are served same-origin and cached by the service
worker — the editor keeps its typography offline. `next/font` mangles family
names, so documents store the *human* name ("Playfair Display") and
`resolveFontFamily()` translates to the generated name at render time. Stored
data never has to migrate. The *chrome* fonts are separate — Archivo and
IBM Plex Mono, loaded in `app/layout.tsx` under their own CSS variables — so
restyling the UI can never disturb a saved document's typography.

**Theming.** Light (warm paper) and dark are a first-class pair. The preference
lives in `app/store/theme-store.ts` (`light | dark | system`, default `system`,
persisted to `localStorage`), and a blocking inline script in the root layout
applies the `.dark` class before first paint so there is no flash. Konva can't
read CSS variables, so the canvas chrome (selection frame, handles, marquee,
snap guides, artboard shadow) comes from `app/lib/theme-colors.ts` instead. The
document itself never follows the chrome theme. See `docs/design-guidelines.md`
for the token system and the Tailwind v4 indirection it depends on.

**Export.** `stage.toDataURL()` to PNG or JPEG at the format's native
resolution; projects also export/import as a JSON file (`app/lib/project-io.ts`).

---

## Persistence

IndexedDB (Dexie, `app/lib/db.ts`) is the only store.

1. Autosave (`use-autosave.ts`) writes the current project every few seconds and
   asks for persistent storage (`navigator.storage.persist()`) so the browser
   doesn't evict the user's only copy.
2. Uploaded images go to the `assets` table; an image element's `src` is
   `asset:<id>` and resolves to an object URL at render time
   (`app/lib/local-assets.ts`). Object URLs are same-origin, so PNG export never
   hits a tainted canvas.
3. `.modo` files (schema v3) embed the images a design uses as data URLs, and
   import puts them back under the same ids. Settings → *Back up everything*
   writes every project and image into one `.modobackup` file; restoring it
   merges, keeping whichever copy of a project is newer.

---

## Licensing

A key is `MODO-` + Crockford base32 of a 12-byte payload (version, source,
10-byte license id) and its 64-byte Ed25519 signature
(`app/lib/license/format.ts`). The app verifies it locally against
`LICENSE_PUBLIC_KEYS` — no network needed, ever. The license id is the server's
`License` row id, so the server can answer `GET /api/license/status`, which the
app calls at most daily when online: `revoked` (refund, chargeback, AppSumo
deactivate) locks the device; any failure fails open.

Without a valid license the editor and dashboard render only the activation
screen (`LicenseGate`). The gate is client-side — bypassable by a determined
user, accepted for a one-time-price app that must work with no server.

Delivery: Paddle's `transaction.completed` creates the row and emails a
one-click link; the checkout screen also polls `by-transaction` and activates
itself. AppSumo sends lifecycle webhooks and redirects buyers through
`/api/appsumo/redeem`. Full setup: `docs/PAYMENTS_SETUP.md`.

---

## AI generation

`generateDesign()` (`app/lib/ai/generate.ts`) turns a text brief into a finished
design in two model calls, both using JSON-schema-constrained output, sent
straight from the browser to `api.anthropic.com` with the user's own key
(stored in IndexedDB, set in Settings; `dangerouslyAllowBrowser` is safe here
because the key belongs to the person at the keyboard):

1. **Select** — the model picks a template by name from an enum of the
   template names, given a compact index of their structure. An invalid name is
   impossible by construction.
2. **Fill** — the model receives a *manifest* of that template
   (`app/lib/ai/manifest.ts`) and returns content, palette, fonts, per-slot font
   scales, a background spec, and a project name. A server-side refusal
   fallback to `claude-sonnet-5` is enabled on this call.

The key design decision: **the model never sees or writes geometry.** The
manifest exposes text slots (role, current text, `maxChars`), the color list and
the font list — no x/y/width. Backgrounds are described with tokens
(`flat | linear | radial` + a direction name), never coordinates. Every returned
array is positional and its length is fixed by the manifest; an array with the
wrong length is discarded and the template's original is used. So a bad
generation degrades to the original template rather than to a broken layout.
After the merge, `app/lib/text-fit.ts` measures the real Konva text nodes and
shrinks anything that overflows its box.

There is no quota: usage is billed to the user's Anthropic account.

---

## Offline / PWA

`app/manifest.ts` + `public/sw.js` make the app installable and usable offline:
the app shell (`/`, `/dashboard`, `/activate`), bundled fonts and static assets
are cached stale-while-revalidate. Designs, images and the license all live on
the device, so once loaded the app needs no network except for AI calls and the
daily license check. There is an iOS install hint since Safari has no install
prompt.

`/api/` is **excluded from the worker** — a cached license status would hide a
refund, a cached "not ready" would stall a checkout. `CACHE` is versioned
(`modo-v3`) and `activate` deletes every other cache.

---

## Environment

```
DATABASE_URL, DIRECT_URL            Neon (pooled runtime / direct migrations)
LICENSE_PRIVATE_KEY, APP_URL
PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENV, NEXT_PUBLIC_PADDLE_PRICE_ID_LTD
NEXT_PUBLIC_LTD_PRICE_LABEL         (optional)
APPSUMO_API_KEY, APPSUMO_CLIENT_ID, APPSUMO_CLIENT_SECRET
RESEND_API_KEY, LICENSE_EMAIL_FROM
```

## Commands

```bash
npm run dev         # next dev
npm run build       # prisma generate && next build
npm run db:migrate  # prisma migrate dev
npm run db:deploy   # prisma migrate deploy
npm run lint
```

> **Note:** this repo targets Next.js 16, which has breaking changes against
> older App Router conventions. Check `node_modules/next/dist/docs/` before
> writing framework code — see `AGENTS.md`.
