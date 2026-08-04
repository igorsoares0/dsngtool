import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// NOTE: no `server-only` here. The better-auth CLI imports this module to
// generate the Prisma schema (`npx @better-auth/cli generate`), and it would
// throw outside the Next bundler. That's also why we build our own client
// instead of reusing app/lib/server/db.ts.
const globalForAuthPrisma = globalThis as unknown as { authPrisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

const prisma = globalForAuthPrisma.authPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForAuthPrisma.authPrisma = prisma;

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
/** Google is opt-in: without credentials the provider is simply not registered. */
const hasGoogle = Boolean(googleId && googleSecret);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Explicit rather than inherited: the default only switches on in production,
  // which means the limits are never exercised in dev and a regression here
  // ships unnoticed. Memory storage matches the single-process deployment (see
  // app/lib/server/rate-limit.ts for the same reasoning); the database backend
  // would need a `rateLimit` model and a migration.
  rateLimit: {
    enabled: true,
    storage: "memory",
    window: 60,
    max: 100,
    customRules: {
      // Credential endpoints are the ones worth guarding: these are the paths
      // where a bounded number of attempts is the whole defense.
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 3600, max: 10 },
      "/forget-password": { window: 3600, max: 5 },
      "/reset-password": { window: 3600, max: 10 },
    },
  },

  emailAndPassword: {
    enabled: true,
    // Enforced. This used to be off on the grounds that the editor was
    // offline-first and an inbox round-trip would break first run — but the app
    // has a backend now, every page is gated on a session anyway, and you are
    // necessarily online at the moment you sign up. What the flag actually buys:
    // an unverified address can't farm the free AI quota, and it can't be
    // matched to a Paddle customer (see resolveUserId in the Paddle webhook).
    //
    // Turning this on means sign-up no longer returns a session and sign-in
    // 403s with EMAIL_NOT_VERIFIED until the link is clicked, so both forms
    // have states for that.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // Imported lazily: ./email is `server-only`, which would break the CLI's
      // static import of this file.
      const { sendPasswordResetEmail } = await import("./email");
      await sendPasswordResetEmail({ to: user.email, url });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // A sign-in attempt by an unverified user re-sends the link, so an expired
    // or lost email self-heals by just trying to log in. Safe to trigger from an
    // unauthenticated endpoint because better-auth verifies the password
    // *before* this branch (see sign-in.mjs) — a stranger can't use it to mail
    // -bomb an address they don't have the password for.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { sendVerificationEmail: send } = await import("./email");
      await send({ to: user.email, url });
    },
  },

  ...(hasGoogle
    ? {
        socialProviders: {
          google: { clientId: googleId!, clientSecret: googleSecret! },
        },
      }
    : {}),

  // Must stay last — it flushes Set-Cookie headers for server actions.
  plugins: [nextCookies()],
});

export const isGoogleEnabled = hasGoogle;
