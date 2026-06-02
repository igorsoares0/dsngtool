import "server-only";
import { randomInt } from "node:crypto";

// Excludes ambiguous characters (0/O, 1/I) so keys are easy to read/type.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function block(): string {
  let out = "";
  for (let i = 0; i < 4; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

// e.g. "DSGN-7K2P-9QXM-4WHT" — random, looked up in the DB on validation.
export function generateKey(): string {
  return `DSGN-${block()}-${block()}-${block()}`;
}
