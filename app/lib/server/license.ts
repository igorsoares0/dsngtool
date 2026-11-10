import "server-only";
import { prisma } from "./db";
import {
  newLicenseId,
  signLicense,
  type LicenseSource,
} from "../license/format";

export interface IssuedLicense {
  id: string;
  key: string;
  email: string | null;
  status: string;
  /** False when the row already existed (a retried webhook, a repeat redeem). */
  created: boolean;
}

function privateKey(): string {
  const k = process.env.LICENSE_PRIVATE_KEY;
  if (!k) throw new Error("LICENSE_PRIVATE_KEY is not set");
  return k;
}

/** Re-derive the signed key for a stored license (Ed25519 is deterministic). */
export function keyFor(license: { id: string; source: string }): Promise<string> {
  return signLicense(
    { v: 1, src: license.source as LicenseSource, id: license.id },
    privateKey()
  );
}

/** Public URL of the app, for links in emails and redirects. */
export function appUrl(): string {
  return (process.env.APP_URL ?? "https://app.getmodo.pro").replace(/\/$/, "");
}

/** Deep link that activates a key in one click. Fragment, so it never hits a server log. */
export function activateUrl(key: string): string {
  return `${appUrl()}/activate#key=${encodeURIComponent(key)}`;
}

/**
 * Find or create the license for an external purchase. Idempotent on
 * `externalId`: webhooks retry, and AppSumo sends several events per license.
 * An existing row keeps its status — re-issuing never un-revokes a refund.
 */
export async function issueLicense(opts: {
  source: LicenseSource;
  externalId: string;
  email?: string | null;
  tier?: string | null;
}): Promise<IssuedLicense> {
  const existing = await prisma.license.findUnique({ where: { externalId: opts.externalId } });
  if (existing) {
    // Fill in an email learned later (AppSumo's activate after purchase).
    if (!existing.email && opts.email) {
      await prisma.license.update({ where: { id: existing.id }, data: { email: opts.email } });
    }
    return {
      id: existing.id,
      key: await keyFor(existing),
      email: existing.email ?? opts.email ?? null,
      status: existing.status,
      created: false,
    };
  }

  try {
    const row = await prisma.license.create({
      data: {
        id: newLicenseId(),
        source: opts.source,
        externalId: opts.externalId,
        email: opts.email ?? null,
        tier: opts.tier ?? null,
      },
    });
    return { id: row.id, key: await keyFor(row), email: row.email, status: row.status, created: true };
  } catch (err) {
    // Two deliveries racing on the same purchase: the loser reads the winner's row.
    const row = await prisma.license.findUnique({ where: { externalId: opts.externalId } });
    if (!row) throw err;
    return { id: row.id, key: await keyFor(row), email: row.email, status: row.status, created: false };
  }
}

export async function setLicenseStatus(
  externalId: string,
  status: "active" | "revoked"
): Promise<boolean> {
  const res = await prisma.license.updateMany({
    where: { externalId },
    data: { status, revokedAt: status === "revoked" ? new Date() : null },
  });
  return res.count > 0;
}
