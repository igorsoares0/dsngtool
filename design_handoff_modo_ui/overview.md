# Modo — Technical Overview

Modo is a browser-based visual design editor for social media content — Instagram
posts and stories, Pinterest graphics, promo banners. It runs entirely in the
browser (installable as a PWA, works offline), with an account layer that syncs
projects and uploads across devices and a subscription that raises the quotas.

Positioning: a lighter, faster Canva. No install, no learning curve, a small
toolset that covers what people actually use.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Canvas | Konva / react-konva |
| State | Zustand |
| Styling | Tailwind CSS v4 (`@theme inline` tokens in `app/globals.css`) |
| Local storage | IndexedDB via Dexie |
| Server DB | PostgreSQL (Neon) via Prisma 7 + `@prisma/adapter-pg` |
| Auth | better-auth (email/password, optional Google) |
| File storage | Cloudflare R2 (S3 SDK) |
| AI | Anthropic SDK (`claude-opus-4-8`) |
| Billing | Paddle Billing |
| Email | Resend |
| Hosting | Coolify on Hetzner (`app.getmodo.pro`) |

---

## Application shape

```
app/
  page.tsx              → the editor (single route)
  dashboard/            → account, projects, storage, subscription
  (auth)/               → login, signup, forgot-password, reset-password
  api/
    ai/generate         → AI design generation
    assets/[...key]     → serves R2 objects when no public R2 domain is set
    auth/[...all]       → better-auth handler
    me                  → session + pro flag + storage status
    projects[/id]       → project CRUD for cross-device sync
    uploads             → image upload to R2 (quota-checked)
    webhooks/paddle     → subscription lifecycle
  components/editor/    → topbar, sidebar, panels, canvas, modals
  store/                → editor-store, entitlement-store, toast-store
  lib/                  → client libs (db, fonts, sync, text-fit, device-id)
  lib/server/           → server-only (auth, db, r2, storage, session, email)
  data/                 → templates.ts (53 templates), assets.ts
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

**Fonts** (`app/lib/fonts.ts`). 14 design families are bundled at build time via
`next/font/google`, so they are served same-origin and cached by the service
worker — the editor keeps its typography offline. `next/font` mangles family
names, so documents store the *human* name ("Playfair Display") and
`resolveFontFamily()` translates to the generated name at render time. Stored
data never has to migrate.

**Export.** `stage.toDataURL()` to PNG or JPEG at the format's native
resolution; projects also export/import as a JSON file (`app/lib/project-io.ts`).

---

## Persistence and sync

IndexedDB is the working store; the server is the cross-device source of truth.

1. Autosave (`use-autosave.ts`) writes the current project to Dexie.
2. `app/lib/project-sync.ts` reconciles Dexie against `/api/projects` using
   **last-write-wins on the client's `updatedAt`**. That is why `Project.updatedAt`
   in Prisma is *not* `@updatedAt` — it is set from the client payload.
3. Deletes are tombstones (`deletedAt`) so they propagate instead of being
   resurrected by the next pull. Offline deletes queue in a local settings row.
4. Signed-out users still get the full editor; everything stays local.

---

## Accounts, storage, billing

**Auth** — better-auth with the Prisma adapter. Email verification is sent but
not enforced (`requireEmailVerification: false`): the editor works offline and
gating first run behind an inbox round-trip would break it. Google is opt-in —
without `GOOGLE_CLIENT_ID`/`SECRET` the provider simply isn't registered.
Password reset and verification emails go out through Resend.

**Uploads** — `POST /api/uploads` validates MIME type against an allow-list
(png/jpeg/webp/gif — no SVG), enforces a 15 MB per-file cap, checks the plan
quota *before* writing, then puts the object in R2 and records an `Asset` row
with its byte size. Usage is `sum(bytes)` per user. Objects are served from a
public R2 domain when `R2_PUBLIC_URL` is configured, otherwise proxied through
`/api/assets/<key>`.

**Plans** (`app/lib/server/storage.ts`, `app/api/ai/generate/route.ts`):

| | Free | Pro |
| --- | --- | --- |
| Storage | 250 MB | 1 GB |
| AI generations / month | 5 | 100 |

**Billing** — Paddle Billing. Checkout opens client-side
(`app/lib/paddle-checkout.ts`); `POST /api/webhooks/paddle` verifies the
signature and upserts a `Subscription` row on every `subscription.*` event.
Entitlement is derived server-side from subscription `status` — the client's
claim is never trusted. A scheduled cancellation keeps access until
`cancelScheduledAt`.

---

## AI generation

`POST /api/ai/generate` turns a text brief into a finished design in two model
calls, both using JSON-schema-constrained output:

1. **Select** — the model picks a template by name from an enum of the 53
   template names, given a compact index of their structure. An invalid name is
   impossible by construction.
2. **Fill** — the model receives a *manifest* of that template
   (`app/lib/ai/manifest.ts`) and returns content, palette, fonts, per-slot font
   scales, a background spec, and a project name.

The key design decision: **the model never sees or writes geometry.** The
manifest exposes text slots (role, current text, `maxChars`), the color list and
the font list — no x/y/width. Backgrounds are described with tokens
(`flat | linear | radial` + a direction name), never coordinates. Every returned
array is positional and its length is fixed by the manifest; an array with the
wrong length is discarded and the template's original is used. So a bad
generation degrades to the original template rather than to a broken layout.
After the merge, `app/lib/text-fit.ts` measures the real Konva text nodes and
shrinks anything that overflows its box.

Quota is metered per device id per month (`AiUsage`, keyed `deviceId + "YYYY-MM"`)
and the credit is **reserved before** the upstream call, so a crash can't be
replayed for free. The tier that sets the limit comes from the server session.

---

## Offline / PWA

`app/manifest.ts` + `public/sw.js` make the editor installable and usable
offline: the app shell, bundled fonts, and static assets are cached; projects
live in IndexedDB and flush to the server when the connection returns. There is
an iOS install hint since Safari has no install prompt.

---

## Environment

```
DATABASE_URL, DIRECT_URL            Neon (pooled runtime / direct migrations)
BETTER_AUTH_SECRET, BETTER_AUTH_URL
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET     (optional — enables Google sign-in)
R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL
ANTHROPIC_API_KEY                   (absent → /api/ai/generate returns 503)
PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN, NEXT_PUBLIC_PADDLE_ENV, NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY
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
