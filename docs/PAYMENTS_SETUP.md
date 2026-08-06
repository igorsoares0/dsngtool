# Payments Setup (Paddle Billing — monthly subscription)

Modo sells one thing: a **monthly Pro subscription** that raises the quotas.

| | Free | Pro |
| --- | --- | --- |
| Storage (R2 uploads) | 250 MB | 1 GB |
| AI generations / month | 5 | 100 |
| Templates | 47 of 53 | all 53 (`premium: true` in `app/data/templates.ts`) |

Everything else is the same on both tiers: the full editor and export at native
resolution. There is **no watermark** on any tier — it went away with the LTD,
so don't reintroduce it in copy.

Entitlement is derived **server-side** from the `Subscription.status` mirrored
from Paddle. The client's claim about its own tier is never trusted: quota is
enforced in `app/lib/server/storage.ts` (uploads) and
`app/api/ai/generate/route.ts` (AI).

## 1. Environment variables

Copy `.env.example` to `.env` and fill in real values. The payment-related ones:

| Var | Where to get it |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (runtime) |
| `DIRECT_URL` | Neon **direct** connection string (migrations) |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle → Developer tools → Authentication (client token) |
| `NEXT_PUBLIC_PADDLE_ENV` | `sandbox` while testing, `production` at launch |
| `NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY` | Price id of the recurring monthly price |
| `PADDLE_API_KEY` | Paddle → Developer tools → Authentication (API key) |
| `PADDLE_WEBHOOK_SECRET` | Paddle → Notifications → your destination (`pdl_ntfset_…`) |

The `NEXT_PUBLIC_*` ones are inlined at **build** time, not read at runtime — see
`DEPLOY.md` §5 if the checkout opens empty in production.

## 2. Database

```bash
npm run db:migrate      # prisma migrate dev (uses DIRECT_URL)
# or for an existing DB / CI:
npm run db:deploy
```

`prisma generate` runs automatically on `postinstall` and `build`.

## 3. Paddle dashboard

1. Start in **sandbox**.
2. Create a **product** + a **recurring monthly price**; copy its price id →
   `NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY`.
3. Create a **notification destination** (webhook) pointing at
   `https://<your-host>/api/webhooks/paddle`, subscribed to all eight
   **`subscription.*`** events: created, activated, **trialing**, updated,
   **past_due**, paused, resumed, canceled. Copy the secret →
   `PADDLE_WEBHOOK_SECRET`.

   `trialing` and `past_due` are not optional: both are entitling statuses
   (`ENTITLED_STATUSES` in `app/lib/server/storage.ts`), so missing either one
   leaves the mirrored row on a stale status and silently gives or revokes the
   paid ceiling. `subscription.imported` is only needed when migrating existing
   subscriptions in from another provider.

   No other event group is required — the webhook ignores everything that isn't
   `subscription.*`, so subscribing to `transaction.*`, `customer.*` or
   `adjustment.*` only adds deliveries with no effect.
4. Copy the **client token** and **API key** into the env vars above.

### Testing the webhook locally

Paddle must reach a public URL. Tunnel your dev server:

```bash
npm run dev
cloudflared tunnel --url http://localhost:3000   # or: ngrok http 3000
```

Point the Paddle webhook at the tunnel URL and run a **sandbox checkout**.

## 4. How it fits together (code map)

- **Checkout** — `app/lib/paddle-checkout.ts`. Opens Paddle.js client-side with
  `customData: { userId }`, which is what lets the webhook attribute the
  resulting subscription to a Modo account.
- **Webhook** — `app/api/webhooks/paddle/route.ts`. Verifies the signature over
  the **raw** body (`paddle.webhooks.unmarshal`), then upserts a `Subscription`
  row on every `subscription.*` event. Every such event carries the full
  subscription state, so one upsert keeps the mirror correct no matter which
  event fired or in what order they arrive.
- **Attribution** — `resolveUserId()` tries, in order: `customData.userId` → the
  existing row for that subscription id (later events may drop customData) →
  the Paddle customer's email matched against `user.email`. If none resolve, it
  logs and acks (a retry can't add attribution that isn't there).
- **Entitlement** — `isPro()` in `app/lib/server/storage.ts`, read by
  `GET /api/me` and by the quota checks. A customer who schedules a cancellation
  keeps access until `cancelScheduledAt`.
- **UI** — `app/components/editor/upgrade-modal.tsx` and the storage meter;
  `/dashboard` shows subscription state.

The `Subscription` row is created **asynchronously** by the webhook, so after a
successful checkout the client polls `GET /api/me` to pick up the new tier.

## 5. Quick local check without Paddle

Insert an active subscription straight into Neon for your user:

```sql
insert into "Subscription" (id, "userId", status, "priceId", "createdAt", "updatedAt")
values ('sub_test', '<your-user-id>', 'active', 'pri_test', now(), now());
```

Reload — the storage meter should show the 1 GB quota and AI should allow 100
generations for the month.

## Security note

Gating is server-side and there is nothing meaningful to bypass on the client:
uploads are rejected over quota before anything is written to R2, and
`POST /api/ai/generate` requires a session and meters against `AiUsage` keyed by
`userId`. A refund or cancellation lands as a `subscription.*` event and
downgrades the user on the next request.
