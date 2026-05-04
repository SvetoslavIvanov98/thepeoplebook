const { Resend } = require('resend');
const logger = require('../utils/logger');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Renders the welcome email HTML template.
 */
const welcomeTemplate = ({ name, loginUrl }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ThePeopleBook</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:16px 16px 0 0;padding:40px 48px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#fff;letter-spacing:-0.5px;">
                ThePeopleBook
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">
                Your social universe starts here
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#13131a;padding:48px;border-left:1px solid #1e1e2e;border-right:1px solid #1e1e2e;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#f5f5ff;font-weight:600;">
                Welcome aboard, ${name}! 👋
              </h2>
              <p style="margin:0 0 20px;color:#a0a0b8;font-size:15px;line-height:1.7;">
                We're excited to have you join ThePeopleBook community. Your account is all set and ready to go!
              </p>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#1a1a27;border-radius:12px;padding:20px 24px;border-left:3px solid #6d28d9;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#a78bfa;text-transform:uppercase;letter-spacing:0.5px;">Get Started</p>
                    <ul style="margin:0;padding-left:20px;color:#a0a0b8;font-size:14px;line-height:2;">
                      <li>Complete your profile with a photo and bio</li>
                      <li>Follow people who inspire you</li>
                      <li>Share your first post with the world</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}"
                       style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">
                      Go to ThePeopleBook →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f0f1a;border-radius:0 0 16px 16px;padding:24px 48px;border:1px solid #1e1e2e;border-top:none;text-align:center;">
              <p style="margin:0;color:#4a4a6a;font-size:12px;line-height:1.6;">
                You received this email because you created an account on ThePeopleBook.<br/>
                If this wasn't you, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Queues a welcome email via Resend for a newly registered user.
 * @param {{ to: string, name: string }} options
 */
const sendWelcomeEmail = async ({ to, name }) => {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    logger.warn('[email.service] RESEND_API_KEY or EMAIL_FROM not set — skipping welcome email');
    return;
  }

  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Welcome to ThePeopleBook, ${name}! 🎉`,
    html: welcomeTemplate({ name, loginUrl }),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  logger.info(`[email.service] Welcome email sent to ${to} (id: ${data.id})`);
  return data;
};

module.exports = { sendWelcomeEmail };
