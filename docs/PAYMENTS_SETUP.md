# Payments & Licensing Setup (lifetime license, signed keys)

Modo is sold as a one-time lifetime license. There are two ways to buy it:

- **Direct** — Paddle checkout, one-time price.
- **AppSumo** (and similar marketplaces) — AppSumo owns its license keys and
  tells us about them through its Licensing API (webhooks + OAuth redeem).

Either way the buyer ends up with a **Modo key**: an Ed25519 signature over a
tiny payload, verified **on the device** (`app/lib/license/format.ts`). The app
never needs the server to accept a key, so it works offline forever. The server
only remembers which licenses exist and whether one was refunded.

## 1. Signing key

```bash
node scripts/license-keygen.mjs
```

- The **public** key goes into `LICENSE_PUBLIC_KEYS` in `app/lib/license/format.ts`
  (already set — only change it to rotate).
- The **private** key goes into `LICENSE_PRIVATE_KEY` (local `.env`, Coolify)
  and your password manager. Lose it and you cannot issue keys the shipped app
  accepts; leak it and anyone can mint keys.
- **Rotating:** add the new public key to the list *first*, ship, then switch
  `LICENSE_PRIVATE_KEY`. Old keys keep working as long as their public key
  stays in the list.

## 2. Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `LICENSE_PRIVATE_KEY` | server | signs keys |
| `APP_URL` | server | activation links in emails, AppSumo redirect |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENV` | build | Paddle.js |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_LTD` | build | the one-time price; the webhook only fulfils transactions containing it |
| `NEXT_PUBLIC_LTD_PRICE_LABEL` | build | optional, shown on the buy button |
| `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` | server | customer email lookup, webhook signature |
| `APPSUMO_API_KEY` | server | AppSumo webhook signature (HMAC-SHA256 of `timestamp + body`) |
| `APPSUMO_CLIENT_ID`, `APPSUMO_CLIENT_SECRET` | server | OAuth code exchange on redeem |
| `RESEND_API_KEY`, `LICENSE_EMAIL_FROM` | server | the license email |

## 3. Database

One table, `License` (`prisma/schema.prisma`). The signed key is **not**
stored — Ed25519 is deterministic, so it is re-derived from `(id, source)`.

```bash
npm run db:migrate   # dev
npm run db:deploy    # prod / CI
```

## 4. Flows

**Direct purchase**
1. Activation screen → `openLtdCheckout()` (`app/lib/paddle-checkout.ts`).
2. Paddle → `POST /api/webhooks/paddle` `transaction.completed` → `issueLicense`
   (idempotent on the transaction id) → license email with a one-click
   `/activate#key=…` link.
3. Meanwhile the checkout screen polls `GET /api/license/by-transaction?txn=`
   and activates the device as soon as the key exists.

**AppSumo**
1. AppSumo → `POST /api/webhooks/appsumo` (`purchase`, `activate`, `upgrade`,
   `downgrade`, `deactivate`). Upgrades re-point the existing row to the new
   AppSumo key, so the Modo key the buyer already has stays valid.
2. Buyer clicks **Activate** on AppSumo → `GET /api/appsumo/redeem?code=` →
   code exchange → license lookup → redirect to `/activate#key=…`.

**Refunds**
- Paddle full refund / chargeback (`adjustment.*`, approved) and AppSumo
  `deactivate` set `status = revoked`.
- The app calls `GET /api/license/status?id=` at most once a day when online.
  `revoked` locks the device; offline or a failed check keeps it unlocked.

**Manual keys** (support, reviewers, giveaways)

```bash
node --env-file=.env scripts/issue-license.mjs --note "reviewer: jane" [--email a@b.c]
```

## 5. Testing the Paddle webhook locally

Sign the raw body yourself with `PADDLE_WEBHOOK_SECRET`:
`paddle-signature: ts=<unix>;h1=<hex HMAC-SHA256 of "<ts>:<body>">`. The route
only checks the signature and reads `data.id`, `data.customer_id` and
`data.items[].price.id` (and `transaction_id`, `action`, `type`, `status` on
adjustments), so a minimal payload is enough.

## Security notes

- The gate is client-side; DevTools can bypass it. Accepted for a one-time,
  offline-capable app — the signature stops casual key sharing *of invented
  keys*, the daily status check catches refunds, nothing stops a determined
  cracker.
- `by-transaction` hands the key to anyone who knows the transaction id. Ids
  only appear in the buyer's checkout and receipt.
