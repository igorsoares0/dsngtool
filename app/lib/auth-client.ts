"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin: the catch-all handler lives at /api/auth on this app.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
