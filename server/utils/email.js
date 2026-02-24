const RESEND_API_URL = "https://api.resend.com/emails";

function getSenderAddress() {
  return process.env.EMAIL_FROM || "HypeKicks <no-reply@hypekicks.local>";
}

function shouldUseResend() {
  return Boolean(process.env.RESEND_API_KEY);
}

function shouldUseSmtp() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject) {
    return { sent: false, provider: "none", error: "Missing email recipient or subject" };
  }

  if (shouldUseResend()) {
    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: getSenderAddress(),
          to: [to],
          subject,
          text,
          html,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return { sent: false, provider: "resend", error: body || "Resend request failed" };
      }

      return { sent: true, provider: "resend" };
    } catch (error) {
      return { sent: false, provider: "resend", error: error?.message || "Resend network error" };
    }
  }

  if (shouldUseSmtp()) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Boolean(process.env.SMTP_SECURE === "true"),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: getSenderAddress(),
        to,
        subject,
        text,
        html,
      });

      return { sent: true, provider: "smtp" };
    } catch (error) {
      return { sent: false, provider: "smtp", error: error?.message || "SMTP send failed" };
    }
  }

  return { sent: false, provider: "dev", error: "No email provider configured" };
}

export function buildVerificationEmail({ name, verifyLink }) {
  const safeName = name || "there";
  const subject = "Verify your HypeKicks email";
  const text = [
    `Hi ${safeName},`,
    "",
    "Welcome to HypeKicks. Verify your email to activate checkout and account features.",
    "",
    `Verify link: ${verifyLink}`,
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1a1a1a">
      <h2>Verify your HypeKicks email</h2>
      <p>Hi ${safeName},</p>
      <p>Welcome to HypeKicks. Verify your email to activate checkout and account features.</p>
      <p><a href="${verifyLink}" target="_blank" rel="noreferrer">Verify email</a></p>
      <p>If you did not create this account, you can ignore this email.</p>
    </div>
  `;
  return { subject, text, html };
}

export function buildPasswordResetEmail({ name, resetLink }) {
  const safeName = name || "there";
  const subject = "Reset your HypeKicks password";
  const text = [
    `Hi ${safeName},`,
    "",
    "Use the link below to reset your password:",
    `${resetLink}`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1a1a1a">
      <h2>Reset your password</h2>
      <p>Hi ${safeName},</p>
      <p>Use the link below to reset your password:</p>
      <p><a href="${resetLink}" target="_blank" rel="noreferrer">Reset password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;
  return { subject, text, html };
}
