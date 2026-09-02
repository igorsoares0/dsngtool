"use client";

import { createAuthClient } from "better-auth/react";
import { IS_DESKTOP } from "./platform";

// Same-origin: the catch-all handler lives at /api/auth on this app.
//
// The desktop build has no accounts and never issues a request through this
// client — the account UI is hidden at every render site. But the module is
// still evaluated, and better-auth validates its base URL at construction by
// inferring it from window.location, which under Electron's app:// scheme
// throws "Invalid base URL: app://modo" and takes the whole editor down with
// it. An explicit unreachable origin keeps construction quiet. IS_DESKTOP is a
// compile-time false on the web, so that build calls createAuthClient() exactly
// as before.
export const authClient = createAuthClient(
  IS_DESKTOP ? { baseURL: "https://desktop.invalid" } : undefined
);

export const { signIn, signUp, signOut, useSession } = authClient;
