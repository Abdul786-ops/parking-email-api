// api/send-password-reset.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── CONFIG ────────────────────────────────────────────────────────────────
const FROM_EMAIL = 'bookings@parkingpartner.co.uk';
const FROM_NAME  = 'Parking Partner';
const OWNER_EMAIL = 'info@parkingpartner.co.uk';
// ───────────────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    customerEmail,
    customerName,
    resetLink,
    resetToken,
  } = req.body;

  if (!customerEmail || !resetLink) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: customerEmail and resetLink are required' 
    });
  }

  try {
    // Build HTML email for password reset
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset Your Password — Parking Partner</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Georgia,Times,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#ffffff;border-radius:12px;overflow:hidden;
    box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:600px;">

    <!-- Header -->
    <tr>
      <td style="background:#0a2540;padding:28px 32px;text-align:center;">
        <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:22px;
          font-weight:900;color:#f5a623;letter-spacing:1px;">🅿️ Parking Partner</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#94a3b8;">
          Password Reset Request
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:32px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          
          <!-- Intro -->
          <tr><td style="padding-bottom:20px;">
            <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.6;">
              Hello <strong>${customerName || 'Customer'}</strong>,
            </p>
            <p style="margin:12px 0 0;font-size:15px;color:#1e293b;line-height:1.6;">
              We received a request to reset your password for your <strong>Parking Partner</strong> account.
              Click the button below to create a new password:
            </p>
          </td></tr>

          <!-- Reset Button -->
          <tr><td style="padding-bottom:24px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center" style="padding:8px 0;">
                  <a href="${resetLink}" 
                    style="display:inline-block;background:linear-gradient(135deg,#f5a623,#e09117);
                    color:#0a2540;text-decoration:none;padding:14px 40px;border-radius:50px;
                    font-weight:700;font-size:16px;font-family:Arial,sans-serif;
                    border:none;cursor:pointer;">
                    🔐 Reset Password
                  </a>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Manual Link -->
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:13px;color:#64748b;">
              Or copy and paste this link into your browser:
            </p>
            <div style="background:#f1f5f9;padding:12px 16px;border-radius:8px;
              font-family:monospace;font-size:13px;word-break:break-all;margin:8px 0;
              color:#0a2540;">
              ${resetLink}
            </div>
          </td></tr>

          <!-- Expiry Note -->
          <tr><td style="padding-bottom:16px;">
            <p style="margin:0;font-size:13px;color:#f59e0b;font-weight:600;">
              ⏰ This link will expire in <strong>1 hour</strong> for security reasons.
            </p>
          </td></tr>

          <!-- Security Tip -->
          <tr><td style="padding-bottom:16px;">
            <div style="background:#fef3c7;padding:16px;border-radius:8px;
              border-left:4px solid #f59e0b;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                <strong>🔒 Security Tip:</strong> If you didn't request a password reset, 
                please ignore this email. Your account remains secure and no changes 
                have been made.
              </p>
            </div>
          </td></tr>

          <!-- Contact -->
          <tr><td>
            <div style="background:#f8fafc;padding:16px;border-radius:8px;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                <strong>Need help?</strong> Contact our support team at 
                <a href="mailto:info@parkingpartner.co.uk" 
                  style="color:#f5a623;text-decoration:none;">info@parkingpartner.co.uk</a>
              </p>
            </div>
          </td></tr>

        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;
        text-align:center;">
        <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;">
          Parking Partner &bull; United Kingdom
        </p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;">
          <a href="https://www.parkingpartner.co.uk" 
            style="color:#cbd5e1;text-decoration:none;">parkingpartner.co.uk</a>
        </p>
        <p style="margin:8px 0 0 0;font-family:Arial,sans-serif;font-size:10px;color:#cbd5e1;">
          &copy; ${new Date().getFullYear()} Parking Partner. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

    // Plain text version
    const textContent = `
PASSWORD RESET REQUEST

Hello ${customerName || 'Customer'},

We received a request to reset your password for your Parking Partner account.

To reset your password, click the link below or copy and paste it into your browser:

${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email. Your account remains secure and no changes have been made.

Need help? Contact us at info@parkingpartner.co.uk

---
Parking Partner
parkingpartner.co.uk
`;

    // Send the password reset email
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Reset Your Password — Parking Partner`,
      html: htmlContent,
      text: textContent,
      reply_to: FROM_EMAIL,
    });

    console.log('Password reset email sent:', result);

    return res.status(200).json({ 
      success: true, 
      message: 'Password reset email sent successfully' 
    });

  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send password reset email' 
    });
  }
};