import nodemailer from 'nodemailer';

// ─── Transporter ───────────────────────────────────────────────────────────
// Configured via environment variables.
// Required env vars:
//   SMTP_USER     – your Gmail address   e.g. yourapp@gmail.com
//   SMTP_PASS     – Gmail App Password   (not your regular password)
//   SMTP_FROM     – display name + address, e.g. "Sashvat Jewels <yourapp@gmail.com>"
//   APP_URL       – frontend base URL,   e.g. https://yourdomain.com

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || `Sashvat Jewels <${process.env.SMTP_USER}>`;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ─── Password Reset Email ───────────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 4px 24px rgba(15,23,42,0.07);">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid #f1f5f9;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:linear-gradient(135deg,#3fa393,#2f7d70);border-radius:14px;margin-bottom:16px;">
                <span style="font-size:26px;">💎</span>
              </div>
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">
                Reset your password
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#64748b;">
                Sashvat Jewels Enterprise ERP
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">
                We received a request to reset the password for your account associated with
                <strong style="color:#0f172a;">${email}</strong>.
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#334155;line-height:1.6;">
                Click the button below to choose a new password. This link will expire in
                <strong style="color:#0f172a;">1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a
                      href="${resetUrl}"
                      style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#3fa393,#2f7d70);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.2px;box-shadow:0 6px 16px rgba(63,163,147,0.35);"
                    >
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:28px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#3fa393;word-break:break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding:0 40px 24px;">
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;">
                <p style="margin:0;font-size:12px;color:#92400e;line-height:1.5;">
                  ⚠️ If you didn't request a password reset, you can safely ignore this email.
                  Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                © ${new Date().getFullYear()} Sashvat Jewels. All rights reserved.
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your Sashvat Jewels password',
    html,
    // Plain-text fallback
    text: `Reset your password\n\nWe received a request to reset the password for ${email}.\n\nClick the link below (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}
