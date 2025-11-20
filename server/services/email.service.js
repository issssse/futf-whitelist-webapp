const nodemailer = require('nodemailer');
const crypto = require('crypto');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser || 'FUTF Minecraft <noreply@futf.se>';
const useJsonTransport =
  !smtpHost ||
  smtpHost === 'localhost' ||
  smtpHost === '127.0.0.1';

const transporter = useJsonTransport
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth:
        smtpUser && smtpUser !== 'none' && smtpPass && smtpPass !== 'none'
          ? { user: smtpUser, pass: smtpPass }
          : undefined,
    });

// Generate verification token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Send verification email
async function sendVerificationEmail(email, token) {
  const appName = process.env.APP_NAME || 'FUTF Minecraft';
  const supportEmail = process.env.SUPPORT_EMAIL || 'minecraft@futf.se';
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${token}`;

  await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject: `${appName} – confirm your email`,
    html: `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f4;padding:40px 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="background:#ffffff;border-radius:18px;box-shadow:0 20px 45px rgba(15,23,42,0.15);overflow:hidden;">
              <tr>
                <td style="background-image:linear-gradient(135deg,#10b981,#2563eb);padding:36px 30px;text-align:center;color:#fff;">
                  <div style="font-size:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${appName}</div>
                  <h1 style="margin:12px 0 0;font-size:28px;font-weight:800;letter-spacing:0.5px;">Your magic link is ready</h1>
                  <p style="margin:10px auto 0;max-width:360px;font-size:15px;line-height:1.5;color:rgba(255,255,255,0.9);">
                    Step into the realm by confirming your email. Click the button below to finish verifying your account.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px;text-align:center;color:#0f172a;">
                  <a href="${verifyUrl}"
                     style="display:inline-block;padding:16px 36px;border-radius:14px;background:#111827;color:#fff;font-size:16px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">
                    Enter the world
                  </a>
                  <p style="margin:24px 0 0;font-size:14px;color:#475569;line-height:1.6;">
                    Open this link on the same device and browser where you filled out the whitelist form. If the button doesn’t respond, copy and paste this URL instead:
                  </p>
                  <p style="margin:12px 0 0;font-size:13px;color:#0f172a;word-break:break-all;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;">
                    ${verifyUrl}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 32px;background:#f8fafc;font-size:13px;color:#475569;text-align:center;">
                  Need help? Reach us at <a href="mailto:${supportEmail}" style="color:#0ea5e9;text-decoration:none;">${supportEmail}</a>.
                  <br/>
                  Didn’t request access? You can safely ignore this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  });
}

async function sendOtpEmail(email, code) {
  await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject: 'Your verification code - FUTF Minecraft',
    html: `
      <h2>Email Verification Code</h2>
      <p>Use the code below to verify your email. It expires in 10 minutes.</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 8px;">${code}</p>
    `,
  });

  if (!useJsonTransport) {
    return null;
  }

  console.info(`[OTP PREVIEW] ${email} -> ${code}`);
  return code;
}

async function sendAppealNotification(emails, payload) {
  if (!emails || emails.length === 0) return;
  const { serverName, userEmail, minecraftName, realName, reason } = payload;
  await transporter.sendMail({
    from: smtpFrom,
    to: emails,
    subject: `New whitelist request for ${serverName}`,
    html: `
      <h2>New Whitelist Request</h2>
      <p><strong>Server:</strong> ${serverName}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Minecraft:</strong> ${minecraftName}</p>
      <p><strong>Name:</strong> ${realName || 'Not provided'}</p>
      <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
    `,
  });
}

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendOtpEmail,
  sendAppealNotification,
};
