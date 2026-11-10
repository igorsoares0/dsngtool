import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

const FROM = process.env.LICENSE_EMAIL_FROM ?? "Modo <onboarding@resend.dev>";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Sends the license key to the buyer. The idempotency key is derived from the
 * purchase, so a retried webhook never sends a second email.
 */
export async function sendLicenseEmail(opts: {
  to: string;
  key: string;
  activateUrl: string;
  idempotencyKey: string;
}) {
  const key = escapeHtml(opts.key);
  const url = escapeHtml(opts.activateUrl);
  await resend.emails.send(
    {
      from: FROM,
      to: opts.to,
      subject: "Your Modo license key",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h1 style="font-size:20px;margin:0 0 12px">Thanks for buying Modo</h1>
          <p style="color:#444;line-height:1.5">Here is your lifetime license. The button below opens Modo and activates it in one step.</p>
          <p style="margin:24px 0">
            <a href="${url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px">Activate Modo</a>
          </p>
          <p style="color:#444;line-height:1.5">Or paste this key on the activation screen:</p>
          <p style="font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;background:#f4f4f5;border-radius:8px;padding:16px;margin:12px 0">${key}</p>
          <p style="color:#888;font-size:13px">Keep this email. The key works on every device and browser you use. Your designs stay on each device, so use Back up in the dashboard to move them.</p>
        </div>
      `,
    },
    { idempotencyKey: opts.idempotencyKey }
  );
}
