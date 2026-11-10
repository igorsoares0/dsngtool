# Modo

Modo is a browser-based visual design editor for social media content: Instagram
posts and stories, Pinterest graphics and promo banners. Think of it as a lighter,
faster Canva. There's nothing to install and almost nothing to learn, and the
toolset is small but covers what people actually use.

It is a local-first PWA sold as a **lifetime license**: no accounts, every design
and image stays on the user's device, and AI generation runs on the user's own
Anthropic API key.

Live at [app.getmodo.pro](https://app.getmodo.pro).

## Features

- **Canvas editor** (Konva) with three element types:
  - **Text**: font, size, alignment, shadow, spacing, auto-fit
  - **Image**: filters (blur, brightness, contrast, grayscale, sepia…), flips, corner radius
  - **Shape**: rectangle, ellipse, triangle, line, with solid or gradient fill and stroke
- **Formats**: Instagram Post (1080×1080), Instagram Story (1080×1920), Pinterest (1000×1500)
- **Editing**: undo/redo, multi-select, snapping guides, zoom/pan, context menu
- **Templates**: 50+ ready-made designs (`app/data/templates.ts`)
- **AI generation**: designs from a brief, called from the browser with the user's own key (`app/lib/ai/generate.ts`)
- **Projects** with multiple pages each, plus preview thumbnails
- **Local storage**: projects and uploaded images live in IndexedDB; `.modo` files and whole-device backups embed the images
- **License**: Ed25519-signed keys verified on the device; sold through Paddle (one-time) and AppSumo
- **Dashboard**: projects and settings (AI key, backup/restore, license, theme)

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Canvas | Konva / react-konva |
| State | Zustand |
| Styling | Tailwind CSS v4 |
| Local data | IndexedDB via Dexie |
| License server | PostgreSQL (Neon) via Prisma 7 — one `License` table |
| Licensing | Ed25519 (`@noble/ed25519`), Paddle one-time + AppSumo Licensing API |
| AI | Anthropic SDK in the browser (BYOK) |
| Email | Resend |
| Hosting | Coolify on Hetzner |

## Getting started

```bash
cp .env.example .env   # fill in the values
npm install            # also runs prisma generate
npm run db:migrate     # apply migrations to your dev database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:deploy` | Apply migrations (prod) |

## Docs

- [`docs/overview.md`](docs/overview.md): technical overview (document model, editor engine, API routes)
- [`DEPLOY.md`](DEPLOY.md): deployment
- [`docs/PAYMENTS_SETUP.md`](docs/PAYMENTS_SETUP.md): payments and licensing (Paddle, AppSumo, signing keys)
