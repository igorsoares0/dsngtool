import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./db";

/**
 * Reads the current session on the server (route handlers, server components,
 * server actions). Returns null when signed out. Use this to gate paid
 * behavior (e.g. the higher AI-generation quota, storage limit) server-side.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Convenience: the signed-in user id, or null. */
export async function getUserId() {
  const session = await getSession();
  return session?.user.id ?? null;
}

/**
 * How this account can prove ownership: whether a password exists at all, and
 * which social providers are linked.
 *
 * The delete-account flow needs both. An account created through Google has no
 * `credential` row, so there is no password to confirm with — better-auth then
 * falls back to requiring a session younger than `freshAge` (24h by default),
 * and the only way to refresh it is another round-trip through the provider.
 * Without this the client can't tell which of those two UIs to render.
 */
export async function getAuthMethods(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { providerId: true, password: true },
  });
  return {
    hasPassword: accounts.some(
      (a) => a.providerId === "credential" && Boolean(a.password)
    ),
    providers: [
      ...new Set(
        accounts
          .map((a) => a.providerId)
          .filter((p) => p !== "credential")
      ),
    ],
  };
}
