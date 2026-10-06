# Modo

Modo is a browser-based visual design editor for social media content: Instagram
posts and stories, Pinterest graphics and promo banners. Think of it as a lighter,
faster Canva. There's nothing to install and almost nothing to learn, and the
toolset is small but covers what people actually use.

Live at [app.getmodo.pro](https://app.getmodo.pro).

## Features

- **Canvas editor** (Konva) with three element types:
  - **Text**: font, size, alignment, shadow, spacing, auto-fit
  - **Image**: filters (blur, brightness, contrast, grayscale, sepia…), flips, corner radius
  - **Shape**: rectangle, ellipse, triangle, line, with solid or gradient fill and stroke
- **Formats**: Instagram Post (1080×1080), Instagram Story (1080×1920), Pinterest (1000×1500)
- **Editing**: undo/redo, multi-select, snapping guides, zoom/pan, context menu
- **Templates**: 50+ ready-made designs (`app/data/templates.ts`)
- **AI generation**: designs from a prompt via the Anthropic SDK (`app/api/ai/generate`)
- **Projects** with multiple designs each, plus preview thumbnails
- **Accounts**: email/password or Google sign-in (better-auth), with mandatory email verification
- **Sync**: projects and uploads are stored server-side (Postgres + Cloudflare R2) and available across devices
- **Subscription**: Paddle Billing, which raises storage quotas and AI credits
- **Dashboard**: account, projects, storage and subscription tabs

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Canvas | Konva / react-konva |
| State | Zustand |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Neon) via Prisma 7 |
| Auth | better-auth |
| File storage | Cloudflare R2 |
| AI | Anthropic SDK |
| Billing | Paddle Billing |
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
- [`docs/PAYMENTS_SETUP.md`](docs/PAYMENTS_SETUP.md): Paddle setup
