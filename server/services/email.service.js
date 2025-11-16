const nodemailer = require('nodemailer');
const crypto = require('crypto');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
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
      auth: smtpUser && smtpUser !== 'none' ? { user: smtpUser, pass: smtpPass } : undefined,
    });

// Generate verification token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Send verification email
async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Verify your email - Minecraft Server',
    html: `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your email:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `,
  });
}

async function sendOtpEmail(email, code) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Your verification code - FUTF Minecraft',
    html: `
      <h2>Email Verification Code</h2>
      <p>Use the code below to verify your email. It expires in 10 minutes.</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 8px;">${code}</p>
    `,
  });
}

async function sendAppealNotification(emails, payload) {
  if (!emails || emails.length === 0) return;
  const { serverName, userEmail, minecraftName, realName, reason } = payload;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
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
