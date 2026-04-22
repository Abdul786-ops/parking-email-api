// api/send-email.js
// ─────────────────────────────────────────────────────────────────────────────
// 🧪 TESTING MODE
//    - Both customer + owner emails go to: khooharorazzaque@gmail.com
//    - FROM uses Resend's free test domain (no domain verification needed)
//
// 🚀 WHEN GOING LIVE — change these 3 lines:
//    OWNER_EMAIL  → 'Info@parkingpartner.co.uk'
//    TEST_EMAIL   → remove and use customerEmail directly
//    FROM_EMAIL   → 'noreply@parkingpartner.co.uk'
// ─────────────────────────────────────────────────────────────────────────────

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// 🧪 Testing — all emails go here
const TEST_EMAIL  = 'info@parkingpartner.co.uk';

// ✅ Resend's free onboarding domain — works WITHOUT verifying your own domain
const FROM_EMAIL  = 'noreply@parkingpartner.co.uk';

module.exports = async function handler(req, res) {
  // ── CORS headers ────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const {
    customerEmail,
    customerName,
    customerPhone,
    bookingId,
    provider,
    airport,
    dropOffDate,
    dropOffTime,
    pickUpDate,
    pickUpTime,
    totalAmount,
    basePrice,
    bookingFee,
    hasFlightDetails,
    departureTerminal,
    departureFlightNo,
    arrivalTerminal,
    arrivalFlightNo,
    vehicleMake,
    vehicleModel,
    vehicleColor,
    vehicleReg,
    cancellationCover,
    smsConfirmation,
    paymentDate,
  } = req.body;

  // ── Email HTML builder ───────────────────────────────────────────────────────
  const buildEmail = (isOwner) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:30px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a2540 0%,#1a3a55 100%);
                       padding:32px 40px;text-align:center;">
              <h1 style="color:#f5a623;margin:0;font-size:28px;font-weight:900;">
                Parking Partner
              </h1>
              <p style="color:#fff;margin:8px 0 0;font-size:14px;opacity:.85;">
                ${isOwner ? '🔔 New Booking Received' : '✅ Your Booking is Confirmed'}
              </p>
            </td>
          </tr>

          <!-- 🧪 TEST MODE BANNER -->
          <tr>
            <td style="background:#ff6b35;padding:10px 40px;text-align:center;">
              <p style="margin:0;color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px;">
                🧪 TEST MODE — This is a test email
              </p>
            </td>
          </tr>

          <!-- SUBTITLE BANNER -->
          <tr>
            <td style="background:#f5a623;padding:14px 40px;text-align:center;">
              <p style="margin:0;color:#0a2540;font-size:15px;font-weight:700;">
                ${isOwner
                  ? `New booking from ${customerName}`
                  : `Thank you, ${customerName}! Your parking spot is reserved.`}
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px 40px;">

              <!-- Booking Reference -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0f7ff;border-radius:10px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">
                      Booking Reference
                    </p>
                    <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#0a2540;">
                      ${bookingId}
                    </p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:11px;color:#666;">Payment Date</p>
                    <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#0a2540;">
                      ${paymentDate}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Parking Details -->
              <h2 style="font-size:15px;font-weight:800;color:#0a2540;margin:0 0 10px;
                         padding-bottom:8px;border-bottom:2px solid #f5a623;">
                🅿️ Parking Details
              </h2>
              <table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:22px;">
                <tr>
                  <td style="color:#555;font-size:13px;width:45%;">Provider</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;">${provider}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Airport</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;padding:6px;">${airport}</td>
                </tr>
                <tr>
                  <td style="color:#555;font-size:13px;">Drop Off</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;">${dropOffDate} at ${dropOffTime}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Pick Up</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;padding:6px;">${pickUpDate} at ${pickUpTime}</td>
                </tr>
              </table>

              <!-- Customer Details -->
              <h2 style="font-size:15px;font-weight:800;color:#0a2540;margin:0 0 10px;
                         padding-bottom:8px;border-bottom:2px solid #f5a623;">
                👤 Customer Details
              </h2>
              <table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:22px;">
                <tr>
                  <td style="color:#555;font-size:13px;width:45%;">Name</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;">${customerName}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Email</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;padding:6px;">${customerEmail}</td>
                </tr>
                <tr>
                  <td style="color:#555;font-size:13px;">Phone</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;">${customerPhone}</td>
                </tr>
              </table>

              <!-- Flight Details -->
              ${hasFlightDetails ? `
              <h2 style="font-size:15px;font-weight:800;color:#0a2540;margin:0 0 10px;
                         padding-bottom:8px;border-bottom:2px solid #f5a623;">
                ✈️ Flight Details
              </h2>
              <table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:22px;">
                <tr>
                  <td style="color:#555;font-size:13px;width:45%;">Departure Terminal</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;">${departureTerminal}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Departure Flight No.</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;padding:6px;">
                    ${departureFlightNo || 'To be confirmed'}
                  </td>
                </tr>
                <tr>
                  <td style="color:#555;font-size:13px;">Arrival Terminal</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;">${arrivalTerminal}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Arrival Flight No.</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;padding:6px;">
                    ${arrivalFlightNo || 'To be confirmed'}
                  </td>
                </tr>
              </table>` : ''}

              <!-- Vehicle Details -->
              ${vehicleMake ? `
              <h2 style="font-size:15px;font-weight:800;color:#0a2540;margin:0 0 10px;
                         padding-bottom:8px;border-bottom:2px solid #f5a623;">
                🚗 Vehicle Details
              </h2>
              <table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:22px;">
                <tr>
                  <td style="color:#555;font-size:13px;width:45%;">Make</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;">${vehicleMake}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Model</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;padding:6px;">${vehicleModel}</td>
                </tr>
                <tr>
                  <td style="color:#555;font-size:13px;">Colour</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;">${vehicleColor}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Registration</td>
                  <td style="color:#0a2540;font-weight:700;font-size:13px;padding:6px;text-transform:uppercase;">
                    ${vehicleReg}
                  </td>
                </tr>
              </table>` : ''}

              <!-- Payment Summary -->
              <h2 style="font-size:15px;font-weight:800;color:#0a2540;margin:0 0 10px;
                         padding-bottom:8px;border-bottom:2px solid #f5a623;">
                💳 Payment Summary
              </h2>
              <table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td style="color:#555;font-size:13px;width:60%;">Parking Price</td>
                  <td style="color:#0a2540;font-weight:600;font-size:13px;text-align:right;">${basePrice}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Booking Fee</td>
                  <td style="color:#0a2540;font-weight:600;font-size:13px;text-align:right;padding:6px;">${bookingFee}</td>
                </tr>
                ${smsConfirmation !== 'No' ? `
                <tr>
                  <td style="color:#555;font-size:13px;">SMS Confirmation</td>
                  <td style="color:#0a2540;font-weight:600;font-size:13px;text-align:right;">+£0.99</td>
                </tr>` : ''}
                ${cancellationCover !== 'No' ? `
                <tr style="background:#fafafa;">
                  <td style="color:#555;font-size:13px;padding:6px;">Cancellation Cover</td>
                  <td style="color:#0a2540;font-weight:600;font-size:13px;text-align:right;padding:6px;">+£2.00</td>
                </tr>` : ''}
              </table>

              <!-- Total -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#0a2540,#1a3a55);
                             border-radius:10px;padding:16px 20px;">
                    <table width="100%">
                      <tr>
                        <td style="color:#fff;font-size:15px;font-weight:700;">Total Paid</td>
                        <td style="color:#f5a623;font-size:22px;font-weight:900;text-align:right;">
                          ${totalAmount}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9f9f9;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#ff6b35;font-weight:600;">
                🧪 TEST MODE — No real payment was taken
              </p>
              <p style="margin:8px 0 0;font-size:13px;color:#888;">
                Questions? <a href="mailto:khooharorazzaque@gmail.com"
                  style="color:#f5a623;text-decoration:none;">khooharorazzaque@gmail.com</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#aaa;">
                © ${new Date().getFullYear()} Parking Partner. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  try {
    // 🧪 In test mode both emails go to your personal Gmail
    // Customer email
    await resend.emails.send({
      from:    `Parking Partner <${FROM_EMAIL}>`,
      to:      TEST_EMAIL,   // 🧪 normally: customerEmail
      subject: `🧪 TEST | ✅ Booking Confirmed – ${provider} at ${airport} (Ref: ${bookingId})`,
      html:    buildEmail(false),
    });

    // Owner email
    await resend.emails.send({
      from:    `Parking Partner <${FROM_EMAIL}>`,
      to:      TEST_EMAIL,   // 🧪 normally: OWNER_EMAIL
      subject: `🧪 TEST | 🔔 New Booking – ${customerName} | ${provider} | ${airport}`,
      html:    buildEmail(true),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
