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

  emailAndPassword: {
    enabled: true,
    // Verification is sent but not enforced — the editor works offline and
    // gating it behind an inbox round-trip would break first-run UX.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // Imported lazily: ./email is `server-only`, which would break the CLI's
      // static import of this file.
      const { sendPasswordResetEmail } = await import("./email");
      await sendPasswordResetEmail({ to: user.email, url });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
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
