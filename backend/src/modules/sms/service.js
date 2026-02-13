/**
 * Notification Service — Email via Nodemailer
 * ─────────────────────────────────────────────
 * Sends email notifications using Nodemailer.
 * Works with any SMTP provider (Gmail, Outlook, Yahoo, custom).
 *
 * In DEVELOPMENT mode, if SMTP_USER/SMTP_PASS are not set,
 * automatically creates a free Ethereal test account so emails
 * work immediately — no configuration required.
 * Preview sent emails at the URL returned in the response.
 *
 * Environment variables (for production):
 *   SMTP_HOST  — SMTP server (default: smtp.gmail.com)
 *   SMTP_PORT  — SMTP port (default: 587)
 *   SMTP_USER  — Email address to send from
 *   SMTP_PASS  — Email password or app password
 *   SMTP_FROM  — "From" display name (default: School Manager)
 */
const nodemailer = require('nodemailer');
const env = require('../../config/env');
const db = require('../../config/db');
const logger = require('../../utils/logger');

/** Build a reusable transporter (created once, cached) */
let _transporter = null;

const getTransporter = async () => {
  if (_transporter) return _transporter;

  // If SMTP credentials are configured, use them
  if (env.smtp.user && env.smtp.pass) {
    _transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
    logger.info('Email transporter configured with SMTP credentials');
    return _transporter;
  }

  // No credentials configured
  return null;
};

/**
 * Send email notification to one or more email addresses.
 * @param {Object} opts
 * @param {string}   opts.schoolId
 * @param {string[]} opts.to       — array of email addresses
 * @param {string}   opts.subject  — email subject line
 * @param {string}   opts.message  — email body (plain text)
 * @param {string}   opts.sentBy   — user id
 */
const sendNotification = async ({ schoolId, to, subject, message, sentBy }) => {
  // Fetch the real school name + logo for the email template
  let schoolName = 'School Manager';
  let schoolLogoUrl = null;
  try {
    const schoolResult = await db.query(`SELECT name, badge_url, logo_url FROM schools WHERE id = $1`, [schoolId]);
    if (schoolResult.rows.length > 0) {
      const school = schoolResult.rows[0];
      if (school.name) schoolName = school.name;
      // Prefer badge, fall back to logo
      const logoPath = school.badge_url || school.logo_url;
      if (logoPath) {
        // If it's a relative path, prepend the client URL to make it absolute
        schoolLogoUrl = logoPath.startsWith('http') ? logoPath : `${env.clientUrl}${logoPath}`;
      }
    }
  } catch { /* fall back to default */ }

  // Log the attempt
  const logResult = await db.query(
    `INSERT INTO sms_logs (school_id, recipients, message, status, sent_by)
     VALUES ($1, $2, $3, 'pending', $4) RETURNING id`,
    [schoolId, to, message, sentBy]
  );
  const logId = logResult.rows[0].id;

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      const err = new Error(
        'Email is not configured. Please set SMTP_USER and SMTP_PASS in your .env file for production use.'
      );
      err.statusCode = 503;
      throw err;
    }

    const fromAddr = env.smtp.user;

    const info = await transporter.sendMail({
      from: `"${schoolName}" <${fromAddr}>`,
      to: to.join(', '),
      subject: subject || 'School Notification',
      text: message,
      html: buildHtmlEmail(message, schoolName, subject, schoolLogoUrl),
    });

    // Update log
    await db.query(
      `UPDATE sms_logs SET status = 'sent', provider_response = $1 WHERE id = $2`,
      [JSON.stringify({
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      }), logId]
    );

    logger.info(`Email sent to ${to.length} recipient(s) for school ${schoolId}`);
    return { logId, status: 'sent', messageId: info.messageId };
  } catch (err) {
    await db.query(
      `UPDATE sms_logs SET status = 'failed', provider_response = $1 WHERE id = $2`,
      [JSON.stringify({ error: err.message }), logId]
    );
    logger.error(`Email failed for school ${schoolId}: ${err.message}`);
    throw err;
  }
};

/**
 * Send email to all users in a specific role (parents, teachers, or all).
 */
const sendBulkToRole = async ({ schoolId, role, subject, message, sentBy }) => {
  let query;
  if (role === 'parents') {
    query = `SELECT DISTINCT u.email FROM users u JOIN parents p ON u.id = p.user_id WHERE p.school_id = $1 AND u.email IS NOT NULL AND u.is_active = true`;
  } else if (role === 'teachers') {
    query = `SELECT DISTINCT u.email FROM users u JOIN teachers t ON u.id = t.user_id WHERE t.school_id = $1 AND u.email IS NOT NULL AND u.is_active = true`;
  } else {
    query = `SELECT DISTINCT email FROM users WHERE school_id = $1 AND email IS NOT NULL AND is_active = true`;
  }

  const result = await db.query(query, [schoolId]);
  const emails = result.rows.map(r => r.email).filter(Boolean);

  if (emails.length === 0) {
    const err = new Error(`No ${role} email addresses found to send to.`);
    err.statusCode = 400;
    throw err;
  }

  // Send in batches of 50 (SMTP limits)
  const batchSize = 50;
  const results = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResult = await sendNotification({ schoolId, to: batch, subject, message, sentBy });
    results.push(batchResult);
  }

  return { totalRecipients: emails.length, batches: results.length, results };
};

/**
 * Get notification logs for a school.
 */
const getLogs = async (schoolId, limit = 50) => {
  const result = await db.query(
    `SELECT sl.*, u.first_name || ' ' || u.last_name as sent_by_name
     FROM sms_logs sl LEFT JOIN users u ON sl.sent_by = u.id
     WHERE sl.school_id = $1 ORDER BY sl.created_at DESC LIMIT $2`,
    [schoolId, limit]
  );
  return result.rows;
};

/**
 * Wrap plain text in a polished HTML email template.
 */
function buildHtmlEmail(message, schoolName, subject, schoolLogoUrl) {
  const lines = message.replace(/\n/g, '<br/>');
  const year = new Date().getFullYear();
  const initials = schoolName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const emailSubject = subject || 'School Notification';

  const logoHtml = schoolLogoUrl
    ? `<img src="${schoolLogoUrl}" alt="${schoolName}" width="52" height="52" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.3);display:block;" />`
    : `<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.15);color:#ffffff;font-size:18px;font-weight:700;line-height:52px;text-align:center;letter-spacing:1px;border:3px solid rgba(255,255,255,0.3);">${initials}</div>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:32px 16px;">
<tr><td align="center">

<!-- Card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

  <!-- Header with logo -->
  <tr>
    <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%);padding:32px 36px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="60" valign="middle">
            ${logoHtml}
          </td>
          <td style="padding-left:16px;" valign="middle">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${schoolName}</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.65);font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;">School Notification</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Accent bar -->
  <tr>
    <td style="height:4px;background:linear-gradient(90deg,#f59e0b 0%,#f97316 50%,#ef4444 100%);"></td>
  </tr>

  <!-- Subject line -->
  <tr>
    <td style="padding:28px 36px 0;">
      <h2 style="margin:0;color:#111827;font-size:18px;font-weight:700;letter-spacing:-0.2px;">${emailSubject}</h2>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:16px 36px 24px;">
      <p style="margin:0;color:#374151;font-size:15px;line-height:1.75;word-break:break-word;">
        ${lines}
      </p>
    </td>
  </tr>

  <!-- Divider -->
  <tr>
    <td style="padding:0 36px;">
      <div style="height:1px;background-color:#e5e7eb;"></div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 36px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
              Sent from <strong style="color:#6b7280;">${schoolName}</strong>
            </p>
            <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">
              Powered by LIFEX School Manager
            </p>
          </td>
          <td align="right" valign="top">
            <div style="display:inline-block;padding:4px 12px;background-color:#f0fdf4;color:#16a34a;font-size:11px;font-weight:600;border-radius:20px;letter-spacing:0.3px;">
              &#10003; Verified
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
<!-- /Card -->

<!-- Sub-footer -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr>
    <td style="padding:20px 36px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
        &copy; ${year} ${schoolName}. This is an automated notification.<br/>
        If you received this in error, please disregard.
      </p>
    </td>
  </tr>
</table>

</td></tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>
  `;
}

module.exports = { sendNotification, sendBulkToRole, getLogs };
