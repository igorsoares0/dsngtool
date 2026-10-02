import type { AiUsage } from "../../lib/ai-limits";

export interface StorageStatus {
  used: number;
  limit: number;
  remaining: number;
}

export interface AuthMethods {
  /** A `credential` account with a password exists on this user. */
  hasPassword: boolean;
  /** Linked social providers, e.g. ["google"]. Never includes "credential". */
  providers: string[];
}

export interface Me {
  user: { id: string; email: string; name: string };
  pro: boolean;
  storage: StorageStatus;
  ai: AiUsage;
  auth: AuthMethods;
}

export interface ProjectRow {
  id: string;
  name: string;
  // The whole stored document — /api/projects has always returned `data` in
  // full, which is what lets the cards draw a real preview without a second
  // request or a stored image.
  data: {
    format?: { name?: string; label?: string; width?: number; height?: number };
    pages?: unknown;
    elements?: unknown;
    backgroundColor?: string;
    backgroundGradient?: unknown;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type Nav = "projects" | "account";
