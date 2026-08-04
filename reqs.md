# Modo — Product Spec

**Browser-based visual design editor · Next.js + Zustand + React Konva + Postgres**

> **Status of this document.** Sections 1–4 and 6–9 describe the system **as built**.
> Section 5 (Functional Requirements) is still a *requirements* list: some of it ships
> today, some is pending, and it does not claim completion. Last revised **2026-08-04**.
>
> **Premise change (2026-08-04):** this started as an offline-first, browser-only tool.
> It is now an account-based cloud product. Anything you remember about "100% browser-based"
> or "offline-first" as *goals* is obsolete — see §1.1.

---

# 1. Project Overview

## Vision

A modern browser-based visual design editor in the spirit of Canva, focused on:

- Social media content creation
- Fast editing experience
- Beautiful templates
- AI-assisted design generation
- Cross-device continuity via a user account
- Smooth performance

Users create Instagram posts, Instagram stories, Pinterest graphics, marketing creatives
and promotional banners without installing software.

## 1.1 Premise change: from offline-first to backend-first

The original spec listed *"Browser-only architecture"* and *"Offline-first support"* as
core goals, and the design constraint at the time was **not** to gate the editor behind
login. That is no longer true.

With the backend in place (accounts, cloud project sync, R2 asset storage, subscriptions,
server-side AI), the product is **account-first**:

- **Every page is gated on a session.** `proxy.ts` redirects signed-out visitors to `/login`.
- **Email verification is mandatory** before reaching the app at all (§4.1).
- **The server is the source of truth** for projects. IndexedDB is now a *local cache and
  offline buffer*, not the system of record.

Offline still *works* — the editor keeps running without a network and buffers writes — but
it is now a **resilience property, not a product pillar** (§6.3). It no longer justifies
weakening authentication.

---

# 2. Core Goals

- Fast, responsive editing at 60fps
- Easy-to-use UI
- Beautiful template system
- Professional editing experience
- Durable, portable work: projects follow the user across devices
- Sustainable unit economics — metered AI and storage, guarded server-side
- Scalable, extensible editor engine

---

# 3. Technical Stack

## Frontend

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4

## State Management

- Zustand

## Canvas Engine

- React Konva / Konva.js

## Backend

- Next.js route handlers (Node runtime) under `app/api/`
- Prisma 7 (driver adapter `@prisma/adapter-pg`) → Neon Postgres
- better-auth 1.6 (email + password, reset, verification, optional Google)
- Paddle Billing (subscriptions) — `@paddle/paddle-node-sdk` + `@paddle/paddle-js`
- Cloudflare R2 via the S3 SDK (user image uploads)
- Resend (transactional email)
- Anthropic SDK (AI generation, `claude-opus-4-8`)

## Local Persistence

- IndexedDB via Dexie.js — **local cache + offline write buffer only**

## Drag and Drop

- dnd-kit

> **Not in use**, despite appearing in earlier drafts: Framer Motion and TanStack Virtual
> are not installed. Transitions are CSS. Do not add them without a reason.

---

# 4. High-Level Architecture

```txt
Browser                                  Server (Next route handlers)
│                                        │
├── Editor Engine                        ├── /api/auth/[...all]   better-auth
│   ├── Canvas Stage                     ├── /api/projects        sync (pull)
│   ├── Layers / Selection               ├── /api/projects/[id]   sync (push, tombstone)
│   ├── Transformer                      ├── /api/uploads         R2 put/delete + quota
│   └── Rendering                        ├── /api/assets/[...key] R2 read proxy
│                                        ├── /api/ai/generate     Anthropic + quota
├── State Layer (Zustand)                ├── /api/me              entitlement + storage
│   ├── editor-store (incl. history)     └── /api/webhooks/paddle subscription mirror
│   ├── entitlement-store                │
│   ├── theme-store                      ├── Postgres (Neon) via Prisma
│   └── toast-store                      │   user · session · account · verification
│                                        │   Project · Asset · Subscription · AiUsage
├── Local Cache (Dexie/IndexedDB)        │
│   ├── Autosave                         └── Cloudflare R2 (image objects)
│   └── Offline write buffer
│
└── Export Layer
    ├── PNG · JPEG
    └── Project JSON (.modo)
```

Sync is **last-write-wins** on a client-authoritative `updatedAt`, with tombstones so
deletes propagate across devices.

## 4.1 Accounts and access

- Sign-up with name, email, password (min 8 chars). Optional Google OAuth when
  `GOOGLE_CLIENT_ID`/`SECRET` are set.
- **Email verification is required.** Sign-up returns no session; sign-in returns
  `403 EMAIL_NOT_VERIFIED` until the emailed link is clicked, which then signs the user in
  automatically. A sign-in attempt by an unverified user re-sends the link.
- Password reset by emailed token. Reset neither creates a session nor marks the address
  verified — it is not a path around verification.
- Entitlement is **always** derived server-side from the `Subscription` mirror. The client's
  claim about its own tier is never trusted.

## 4.2 Plans and limits

| | Free | Pro |
|---|---|---|
| Asset storage (R2) | 250 MB | 1 GB |
| AI generations / month | 5 | 100 |

Enforced regardless of plan:

- Upload: 15 MB per file; raster images only (PNG/JPEG/WebP/GIF), **identified by magic
  bytes**, not by the client's declared type. SVG is excluded deliberately — it can carry
  script.
- Project: 512 KB per project, 200 projects per account. Project JSON lives in Postgres and
  is *not* covered by the R2 storage quota, so it carries its own ceiling.
- Per-user rate limits on all write routes; tighter limits on credential endpoints.

---

# 5. Functional Requirements

> Requirements, not a completion report. Verified-shipped details are called out inline.

## 5.1 Canvas Formats

| Format | Size |
|---|---|
| Instagram Post | 1080 × 1080 |
| Instagram Story | 1080 × 1920 |
| Pinterest | 1000 × 1500 |

## 5.2 Templates

**Shipped:** 52 templates across 45 categories (Wellness, Post, Promo, Story, Pinterest,
Photo, Podcast, Event, Business, Fashion, Food, Fitness, Travel, Tech, Wedding, Real Estate,
Pricing, Webinar, …).

Features: gallery, categories, search, preview thumbnails, duplicate, apply.

## 5.3 Text Editing

Add · edit · resize · rotate · font family · color · opacity · alignment · line-height ·
letter spacing. Controls: bold, italic, underline, uppercase, text shadow.

**Shipped:** 16 font families (14 self-hosted via `next/font` + Arial and Georgia), split
serif / sans-serif / system.

## 5.4 Image Editing

Upload · resize · rotate · crop · flip · opacity · border radius · shadow · layer ordering.

Uploads go to R2 and count against the storage quota. Object keys are opaque UUIDs and
carry no account identifier.

## 5.5 Shapes

**Shipped shape types:** rectangle, ellipse, triangle, **line**.

Controls: fill, stroke color, stroke width, opacity, rotation.

## 5.6 Assets

Stickers, icons, decorative graphics. Library with search, drag to canvas, favorites.

## 5.7 Overlays

Gradients, light leaks, grain, blur and noise textures.

## 5.8 Undo / Redo

Undo, redo, keyboard shortcuts, history persistence. Max history size configurable;
memory-conscious.

## 5.9 Layers

Ordering, lock, hide, duplicate, delete.

## 5.10 Export

**Shipped:** PNG, JPEG, and the project file (`.modo`, JSON) for backup and transfer.
Options: quality selection, transparent background (PNG), high-resolution export.

## 5.11 AI Generation

**Shipped** — this moved out of "future features".

The user writes a brief; the server picks the best-fitting template, then fills text slots,
palette, fonts, per-slot scale and background treatment. Both calls use constrained JSON
schema output. Model responses are re-validated client-side (hex format, font allowlist,
clamped scales, positional array lengths) and fall back to the template's originals when
anything is unusable — a bad response degrades the design, it never breaks it.

---

# 6. Non-Functional Requirements

## 6.1 Performance

Fast canvas rendering, smooth drag, low memory, lazy asset loading, virtualized asset lists.
Target: 60fps interaction.

## 6.2 Scalability

Extensible editor engine, modular components, plugin-friendly architecture.

**Known single-instance assumption:** the write-route rate limiter and better-auth's rate
limiter are both in-memory, matching the single persistent Node process on Coolify. Moving
to multiple instances requires swapping both for a shared store.

## 6.3 Offline behavior

*Downgraded from a core goal to a resilience property — see §1.1.*

- Local autosave to IndexedDB; project recovery after a crash or reload.
- Editing continues without a network; writes are buffered and flushed on reconnect.
- The service worker caches the app shell and **never** caches `/api/` responses — those
  belong to one session, and a cached copy would outlive the sign-in that produced it.
- Not supported: first sign-in offline, or reaching the app with an expired session.

## 6.4 Security

- All pages gated on a session (`proxy.ts`); every API route re-checks server-side, since
  the proxy's cookie check is optimistic and does not validate against the database.
- Ownership checked on every project and asset mutation — client-generated ids are guessable.
- Paddle webhooks verified (HMAC over the raw body) before parsing. Subscriptions are
  attributed by checkout `customData`, then by existing row, then by **verified** email only.
- Uploads validated by magic bytes; served inert (`nosniff`, `Content-Disposition: attachment`,
  `CSP: default-src 'none'; sandbox`) and only when a matching `Asset` row exists.
- Nonce-based Content-Security-Policy per request, plus HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
- AI quota claimed with a conditional UPDATE, so parallel requests cannot overspend a month.

## 6.5 Browser Support

Chrome, Edge, Firefox, Safari.

---

# 7. Data Model

## 7.1 Client — canvas elements

```ts
interface BaseElement {
  id: string
  type: string
  x: number; y: number
  width: number; height: number
  rotation: number; opacity: number
  locked?: boolean; hidden?: boolean
}

interface TextElement extends BaseElement {
  type: "text"
  text: string
  fontSize: number; fontFamily: string
  fill: string
  align: "left" | "center" | "right"
}

interface ImageElement extends BaseElement {
  type: "image"
  src: string
}

interface ShapeElement extends BaseElement {
  type: "shape"
  shapeType: "rectangle" | "ellipse" | "triangle" | "line"
  fill: string
}
```

## 7.2 Server — Prisma models

| Model | Purpose |
|---|---|
| `user` / `session` / `account` / `verification` | better-auth tables |
| `Project` | server copy of an editor project; `updatedAt` is client-authoritative (LWW clock), `deletedAt` is a sync tombstone |
| `Asset` | one uploaded image in R2; `sum(bytes)` per user is the metered storage |
| `Subscription` | mirror of a Paddle subscription; entitlement derives from `status` |
| `AiUsage` | monthly generation count, keyed by `userId` + month — never by anything the client supplies |

---

# 8. State Management

Four Zustand stores. **There is no separate history store** — undo/redo lives inside
`editor-store`, contrary to earlier drafts.

| Store | Responsibility |
|---|---|
| `editor-store` | elements, selection, mutations, undo/redo history |
| `entitlement-store` | plan tier and storage usage from `/api/me` |
| `theme-store` | light / dark / system |
| `toast-store` | transient notifications |

---

# 9. UI Architecture

```txt
┌──────────────────────────────┐
│ Topbar                       │
├──────┬───────────────┬───────┤
│ Left │ Canvas        │ Right │
│ Bar  │               │ Panel │
└──────┴───────────────┴───────┘
```

- **Left sidebar:** Templates · Uploads · Text · Shapes · Assets · Overlays
- **Right panel:** Typography · Colors · Effects · Layers · Position · Size
- **Topbar:** undo · redo · zoom · export · save · account menu
- **Dashboard** (`/dashboard`) is the post-auth landing page: project list, storage meter,
  upgrade. A fresh account has no project to open.

## 9.1 Canvas Engine

```txt
Stage
 ├── Layer
 │    ├── Images · Shapes · Text · Stickers
 └── Transformer
```

Selection: single, multi-select, resize handles, rotation handles.

---

# 10. Project Structure

Routes and code live under `app/` at the repository root — **there is no `src/` directory**.

```txt
app/
├── (auth)/          login · signup · forgot-password · reset-password
├── api/             route handlers (see §4)
├── components/
│   ├── auth/        shared auth form primitives
│   ├── editor/      canvas, panels, modals, toolbar
│   └── ui/
├── dashboard/
├── data/            templates.ts · assets.ts
├── hooks/
├── lib/
│   ├── ai/          manifest + generation merge
│   └── server/      auth · db · storage · r2 · paddle · email · session · rate-limit
├── store/
└── types/
prisma/              schema + migrations
proxy.ts             auth gate + CSP (Next 16's renamed middleware)
```

---

# 11. Future Features

- **Collaboration** — multiplayer editing, shared projects, live presence
- **Animation** — animated elements, timeline editor, video export
- **Smart resize** — post → story → Pinterest, responsive layouts
- **Team/organization accounts**

*(AI generation graduated out of this list — see §5.11.)*

---

# 12. MVP Scope

| Phase | Contents | Status |
|---|---|---|
| 1 | Canvas editor, text, image, resize, drag, undo/redo, PNG export | Shipped |
| 2 | Templates, layers, fonts, stickers, overlays | Shipped |
| 3 | Accounts, cloud sync, subscriptions, AI generation | Shipped |
| 4 | Collaboration, animation, smart resize | Future |

---

# 13. Risks

**Technical**

- Text editing complexity
- Performance bottlenecks and large asset rendering
- Undo/redo memory usage

**Operational / cost**

- AI spend — mitigated by per-user monthly quota and a burst rate limit, both server-side
- Storage growth — R2 quota per plan; project JSON separately capped
- Email deliverability is now on the critical path: verification is the only way into the
  app, so a Resend outage or unverified sending domain blocks all new signups
- Single-instance rate limiting (§6.2)

---

# 14. Success Metrics

**Product:** fast editor startup · smooth editing · low crash rate · high export success rate
**UX:** easy onboarding · low interaction friction · fast template editing
**Business:** signup → verified conversion · free → Pro conversion · AI quota utilisation

---

# 15. Final Notes

The architecture prioritises:

- Performance
- Extensibility
- User experience
- **Server-authoritative correctness** — anything that costs money or grants access is
  decided on the server, never by the client
- Maintainable state management

The system should continue to accommodate collaborative editing and richer AI-powered
design features without structural rework.
