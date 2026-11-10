// Issue a license by hand (support, giveaways, reviewers) and record it.
//
//   node --env-file=.env scripts/issue-license.mjs --note "reviewer: jane" [--email a@b.c] [--dry-run]
//
// Prints the key and its one-click activation link. --dry-run signs a key
// without touching the database (handy for local testing; the status check
// treats unknown ids as active).
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { newLicenseId, signLicense, verifyLicenseKey } from "../app/lib/license/format.ts";

const { values } = parseArgs({
  options: {
    note: { type: "string" },
    email: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const priv = process.env.LICENSE_PRIVATE_KEY;
if (!priv) throw new Error("LICENSE_PRIVATE_KEY is not set (use --env-file=.env)");
if (!values.note && !values["dry-run"]) throw new Error("--note is required (it becomes the externalId)");

const id = newLicenseId();
const key = await signLicense({ v: 1, src: "manual", id }, priv);
if (!(await verifyLicenseKey(key))) {
  throw new Error("signed key does not verify against LICENSE_PUBLIC_KEYS — wrong private key?");
}

if (!values["dry-run"]) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  await prisma.license.create({
    data: {
      id,
      source: "manual",
      externalId: `manual:${values.note}:${id}`,
      email: values.email ?? null,
    },
  });
  await prisma.$disconnect();
}

const base = (process.env.APP_URL ?? "https://app.getmodo.pro").replace(/\/$/, "");
console.log(`id:   ${id}`);
console.log(`key:  ${key}`);
console.log(`link: ${base}/activate#key=${encodeURIComponent(key)}`);
