# Payments & Licensing Setup (Paddle LTD)

This app gates the **free tier** with a watermark on exports and a handful of
premium templates. A **$47 lifetime license** removes both. Licensing is backed
by Neon (Postgres) via Prisma, fulfilled by a Paddle webhook, and validated
online with an offline cache (IndexedDB) so the editor still works offline.

> The same `License` table is designed to also serve **AppSumo** later
> (`source = "appsumo"`). The AppSumo webhook is a documented stub at
> `app/api/webhooks/appsumo/route.ts` — implement it when approved.

## 1. Environment variables

Copy `.env.example` to `.env` and fill in real values:

| Var | Where to get it |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (runtime) |
| `DIRECT_URL` | Neon **direct** connection string (migrations) |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle → Developer tools → Authentication (client token) |
| `NEXT_PUBLIC_PADDLE_ENV` | `sandbox` while testing, `production` at launch |
| `NEXT_PUBLIC_PADDLE_PRICE_ID` | Price id of the $47 one-time product |
| `PADDLE_API_KEY` | Paddle → Developer tools → Authentication (API key) |
| `PADDLE_WEBHOOK_SECRET` | Paddle → Notifications → your destination (`pdl_ntfset_…`) |
| `RESEND_API_KEY` | Resend dashboard |
| `LICENSE_EMAIL_FROM` | A from-address on a verified Resend domain |

## 2. Database

```bash
npm run db:migrate      # prisma migrate dev (uses DIRECT_URL)
# or for an existing DB / CI:
npm run db:deploy
```

`prisma generate` runs automatically on `postinstall` and `build`.

## 3. Paddle dashboard

1. Start in **sandbox**.
2. Create a **product** + a **one-time price** of **$47**; copy its price id →
   `NEXT_PUBLIC_PADDLE_PRICE_ID`.
3. Create a **notification destination** (webhook) pointing at
   `https://<your-host>/api/webhooks/paddle`, subscribe to
   **`transaction.completed`**, copy the secret → `PADDLE_WEBHOOK_SECRET`.
4. Copy the **client token** and **API key** into the env vars above.

### Testing the webhook locally

Paddle must reach a public URL. Tunnel your dev server:

```bash
npm run dev
cloudflared tunnel --url http://localhost:3000   # or: ngrok http 3000
```

Point the Paddle webhook at the tunnel URL and run a **sandbox checkout**.
On `transaction.completed` the webhook:
- verifies the signature (`paddle.webhooks.unmarshal`),
- fetches the buyer email (`paddle.customers.get`),
- creates a `License` (idempotent by transaction id),
- emails the key via Resend.

The post-checkout success screen also polls `GET /api/license/by-transaction`
and shows the key.

## 4. How gating works (code map)

- **Watermark** — `app/lib/watermark.ts`, applied in `topbar.tsx` `handleExport`
  when `tier !== "pro"`.
- **Premium templates** — `premium: true` flag in `app/data/templates.ts`; lock
  badge + upsell in `app/components/editor/left-panel.tsx`.
- **License state** — `app/store/license-store.ts` (+ `app/hooks/use-license.ts`
  boot/revalidation; cached in Dexie `settings`).
- **Upgrade / activate UI** — `app/components/editor/license-modal.tsx`,
  triggered from the topbar **Upgrade** button or any gated action.

## 5. Quick local check without Paddle

Insert an active license directly into Neon, then paste the key into the
in-app **Upgrade → Activate license** field:

```sql
insert into "License" (id, key, source, status, tier, "externalId", "maxActivations", "activationCount", "createdAt", "updatedAt")
values ('test1', 'DSGN-TEST-TEST-TEST', 'paddle', 'active', 'pro', 'txn_test', 3, 0, now(), now());
```

Watermark should disappear and premium templates unlock.

## Security note

Client-side gating (watermark/templates) can be bypassed by editing the JS —
acceptable for a $47 LTD. The server validates keys and the DB is the source of
truth; refunds/deactivations downgrade the user on the next revalidation.
