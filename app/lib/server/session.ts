import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

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
