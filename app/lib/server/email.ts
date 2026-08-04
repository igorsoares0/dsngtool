import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

const FROM = process.env.LICENSE_EMAIL_FROM ?? "Modo <onboarding@resend.dev>";

/** Shared shell so auth emails match the license email already in use. */
function layout(opts: { heading: string; body: string; cta: string; url: string; footer: string }) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${opts.heading}</h1>
      <p style="color:#444;line-height:1.5">${opts.body}</p>
      <p style="margin:24px 0">
        <a href="${opts.url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px">${opts.cta}</a>
      </p>
      <p style="color:#888;font-size:13px">${opts.footer}</p>
      <p style="color:#aaa;font-size:12px;word-break:break-all">Or paste this link into your browser:<br>${opts.url}</p>
    </div>
  `;
}

/**

/** Password reset link. Token is embedded in the URL by better-auth. */
export async function sendPasswordResetEmail(opts: { to: string; url: string }) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Reset your Modo password",
    html: layout({
      heading: "Reset your password",
      body: "We got a request to reset the password on your Modo account. This link expires in 1 hour.",
      cta: "Choose a new password",
      url: opts.url,
      footer: "Didn't ask for this? You can safely ignore this email — your password stays unchanged.",
    }),
  });
}

/** Email confirmation sent on sign-up. Not required to use the editor. */
export async function sendVerificationEmail(opts: { to: string; url: string }) {
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Confirm your Modo email",
    html: layout({
      heading: "Confirm your email",
      body: "Welcome to Modo! Confirm your address so we can reach you about your account.",
      cta: "Confirm email",
      url: opts.url,
      footer: "You can keep using the editor in the meantime — this just secures your account.",
    }),
  });
}
