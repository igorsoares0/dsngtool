import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

const FROM = process.env.LICENSE_EMAIL_FROM ?? "Modo <onboarding@resend.dev>";

/**
 * Sends the license key to the buyer. Uses an idempotency key derived from the
 * transaction so retried webhooks never send duplicate emails.
 */
export async function sendLicenseEmail(opts: {
  to: string;
  key: string;
  idempotencyKey: string;
}) {
  const { to, key, idempotencyKey } = opts;
  await resend.emails.send(
    {
      from: FROM,
      to,
      subject: "Your Modo Design license key",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h1 style="font-size:20px;margin:0 0 12px">Thanks for your purchase 🎉</h1>
          <p style="color:#444;line-height:1.5">Here's your lifetime license key. Open Modo Design, click <strong>Upgrade / Enter license</strong>, and paste it to unlock watermark-free exports and all premium templates.</p>
          <p style="font-size:22px;font-weight:700;letter-spacing:2px;background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;margin:20px 0">${key}</p>
          <p style="color:#888;font-size:13px">Keep this email — your key works on all your devices.</p>
        </div>
      `,
    },
    { idempotencyKey }
  );
}
