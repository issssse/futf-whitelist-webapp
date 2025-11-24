const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser || 'FUTF Minecraft <noreply@futf.se>';
const defaultBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Logo handling: prefer embedded file (CID), otherwise remote URL.
const logoFileName = 'email-logo.png';
const logoFilePath = path.join(__dirname, '..', '..', 'public', logoFileName);
const hasEmbeddedLogo = fs.existsSync(logoFilePath);
const logoCid = 'futf-logo';
const remoteLogoUrl = process.env.LOGO_URL || `${defaultBaseUrl}/${logoFileName}`;
const defaultLogoUrl = hasEmbeddedLogo ? `cid:${logoCid}` : remoteLogoUrl;
const useJsonTransport =
  !smtpHost ||
  smtpHost === 'localhost' ||
  smtpHost === '127.0.0.1';

const primaryTransport = useJsonTransport
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

const fallbackTransport = nodemailer.createTransport({ jsonTransport: true });

async function sendEmail(mail) {
  const mailWithLogo = { ...mail };

  if (hasEmbeddedLogo) {
    mailWithLogo.attachments = [
      ...(mail.attachments || []),
      {
        filename: logoFileName,
        path: logoFilePath,
        cid: logoCid,
      },
    ];
  }

  try {
    return await primaryTransport.sendMail(mailWithLogo);
  } catch (err) {
    console.error('Primary mail transport failed, falling back to JSON transport', err);
    try {
      return await fallbackTransport.sendMail(mailWithLogo);
    } catch (fallbackError) {
      console.error('Fallback mail transport also failed', fallbackError);
      throw fallbackError;
    }
  }
}

// Generate verification token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

const templateCache = new Map();

const renderTemplate = (name, variables = {}) => {
  if (!templateCache.has(name)) {
    const filePath = path.join(__dirname, '..', 'emails', `${name}.html`);
    templateCache.set(name, fs.readFileSync(filePath, 'utf8'));
  }
  let html = templateCache.get(name);
  Object.entries(variables).forEach(([key, value]) => {
    const safe = value === undefined || value === null ? '' : String(value);
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), safe);
  });
  // Simple conditional blocks: {{#if KEY}}...{{/if}}
  html = html.replace(/{{#if ([A-Z_]+)}}([\s\S]*?){{\/if}}/g, (_match, condKey, content) => {
    const val = variables[condKey];
    return val ? content : '';
  });
  return html;
};

// Send verification email
async function sendVerificationEmail(email, token) {
  const appName = process.env.APP_NAME || 'FUTF Minecraft';
  const supportEmail = process.env.SUPPORT_EMAIL || smtpFrom.replace(/.*<([^>]+)>.*/,'$1') || smtpFrom || 'support@futf.se';
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${token}`;

  await sendEmail({
    from: smtpFrom,
    to: email,
    subject: `${appName} – confirm your email`,
    html: renderTemplate('magic-link', {
      APP_NAME: appName,
      SUPPORT_EMAIL: supportEmail,
      VERIFY_URL: verifyUrl,
      LOGO_URL: defaultLogoUrl,
    }),
  });
}

async function sendOtpEmail(email, code) {
  const supportEmail = process.env.SUPPORT_EMAIL || smtpFrom.replace(/.*<([^>]+)>.*/,'$1') || smtpFrom || 'support@futf.se';
  await sendEmail({
    from: smtpFrom,
    to: email,
    subject: 'Your verification code - FUTF Minecraft',
    html: renderTemplate('otp', {
      CODE: code,
      APP_NAME: process.env.APP_NAME || 'FUTF Minecraft',
      LOGO_URL: defaultLogoUrl,
      SUPPORT_EMAIL: supportEmail,
    }),
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
  await sendEmail({
    from: smtpFrom,
    to: emails,
    subject: `New whitelist request for ${serverName}`,
    html: renderTemplate('appeal-notification', {
      SERVER_NAME: serverName,
      USER_EMAIL: userEmail,
      MINECRAFT_NAME: minecraftName,
      REAL_NAME: realName || 'Not provided',
      REASON: reason || 'No reason provided',
      APP_NAME: process.env.APP_NAME || 'FUTF Minecraft',
      LOGO_URL: defaultLogoUrl,
    }),
  });
}

async function sendAppealDecisionEmail(to, payload) {
  if (!to) return;
  const { serverName, decision, minecraftName, userName } = payload;
  const appName = process.env.APP_NAME || 'FUTF Minecraft';
  const templateName = decision === 'approved' ? 'appeal-approved' : 'appeal-rejected';
  await sendEmail({
    from: smtpFrom,
    to,
    subject: `Whitelist request for ${serverName} ${decision === 'approved' ? 'approved' : 'rejected'}`,
    html: renderTemplate(templateName, {
      APP_NAME: appName,
      SERVER_NAME: serverName,
      MINECRAFT_NAME: minecraftName,
      USER_NAME: userName || 'player',
      LOGO_URL: defaultLogoUrl,
    }),
  });
}

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendOtpEmail,
  sendAppealNotification,
  sendAppealDecisionEmail,
};
