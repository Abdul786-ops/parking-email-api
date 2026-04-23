// api/send-email.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const OWNER_EMAIL = 'info@parkingpartner.co.uk'; // lowercase — safer for deliverability
const FROM_EMAIL  = 'noreply@parkingpartner.co.uk';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    customerEmail, customerName, customerPhone,
    bookingId, provider, airport,
    dropOffDate, dropOffTime, pickUpDate, pickUpTime,
    totalAmount, basePrice, bookingFee,
    hasFlightDetails, departureTerminal, departureFlightNo,
    arrivalTerminal, arrivalFlightNo,
    vehicleMake, vehicleModel, vehicleColor, vehicleReg,
    cancellationCover, smsConfirmation, paymentDate,
  } = req.body;

  const buildEmail = (isOwner) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${isOwner ? 'Booking Notification' : 'Booking Confirmation'}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr><td align="center">
      <table width="600" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#0a2540;padding:30px;text-align:center;">
            <h1 style="color:#f5a623;margin:0;font-size:26px;">Parking Partner</h1>
            <p style="color:#ffffff;margin:8px 0 0;font-size:14px;">
              ${isOwner ? 'Booking Notification' : 'Booking Confirmation'}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:30px;">

            <p style="font-size:15px;color:#0a2540;">
              ${isOwner
                ? `A new booking has been received from <strong>${customerName}</strong>.`
                : `Dear ${customerName}, your parking booking has been confirmed.`}
            </p>

            <!-- Booking Reference -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f0f7ff;border-radius:10px;padding:16px;margin:16px 0;">
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">Booking Reference</p>
                  <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#0a2540;">${bookingId}</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-size:11px;color:#666;">Date</p>
                  <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:#0a2540;">${paymentDate}</p>
                </td>
              </tr>
            </table>

            <!-- Customer -->
            <h3 style="color:#0a2540;border-bottom:2px solid #f5a623;padding-bottom:6px;">Customer Details</h3>
            <table width="100%" cellpadding="5" cellspacing="0">
              <tr><td style="color:#555;width:40%;">Name</td><td style="color:#0a2540;font-weight:700;">${customerName}</td></tr>
              <tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Email</td><td style="color:#0a2540;font-weight:700;padding:5px;">${customerEmail}</td></tr>
              <tr><td style="color:#555;">Phone</td><td style="color:#0a2540;font-weight:700;">${customerPhone}</td></tr>
            </table>

            <!-- Parking -->
            <h3 style="color:#0a2540;border-bottom:2px solid #f5a623;padding-bottom:6px;margin-top:20px;">Parking Details</h3>
            <table width="100%" cellpadding="5" cellspacing="0">
              <tr><td style="color:#555;width:40%;">Provider</td><td style="color:#0a2540;font-weight:700;">${provider}</td></tr>
              <tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Airport</td><td style="color:#0a2540;font-weight:700;padding:5px;">${airport}</td></tr>
              <tr><td style="color:#555;">Drop Off</td><td style="color:#0a2540;font-weight:700;">${dropOffDate} at ${dropOffTime}</td></tr>
              <tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Pick Up</td><td style="color:#0a2540;font-weight:700;padding:5px;">${pickUpDate} at ${pickUpTime}</td></tr>
            </table>

            ${hasFlightDetails ? `
            <h3 style="color:#0a2540;border-bottom:2px solid #f5a623;padding-bottom:6px;margin-top:20px;">Flight Details</h3>
            <table width="100%" cellpadding="5" cellspacing="0">
              <tr><td style="color:#555;width:40%;">Departure Terminal</td><td style="color:#0a2540;font-weight:700;">${departureTerminal}</td></tr>
              <tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Departure Flight</td><td style="color:#0a2540;font-weight:700;padding:5px;">${departureFlightNo || 'To be confirmed'}</td></tr>
              <tr><td style="color:#555;">Arrival Terminal</td><td style="color:#0a2540;font-weight:700;">${arrivalTerminal}</td></tr>
              <tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Arrival Flight</td><td style="color:#0a2540;font-weight:700;padding:5px;">${arrivalFlightNo || 'To be confirmed'}</td></tr>
            </table>` : ''}

            ${vehicleMake ? `
            <h3 style="color:#0a2540;border-bottom:2px solid #f5a623;padding-bottom:6px;margin-top:20px;">Vehicle Details</h3>
            <table width="100%" cellpadding="5" cellspacing="0">
              <tr><td style="color:#555;width:40%;">Make</td><td style="color:#0a2540;font-weight:700;">${vehicleMake}</td></tr>
              <tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Model</td><td style="color:#0a2540;font-weight:700;padding:5px;">${vehicleModel}</td></tr>
              <tr><td style="color:#555;">Colour</td><td style="color:#0a2540;font-weight:700;">${vehicleColor}</td></tr>
              <tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Registration</td><td style="color:#0a2540;font-weight:700;padding:5px;text-transform:uppercase;">${vehicleReg}</td></tr>
            </table>` : ''}

            <!-- Payment -->
            <h3 style="color:#0a2540;border-bottom:2px solid #f5a623;padding-bottom:6px;margin-top:20px;">Payment Summary</h3>
            <table width="100%" cellpadding="5" cellspacing="0">
              <tr><td style="color:#555;width:60%;">Parking Price</td><td style="color:#0a2540;font-weight:600;text-align:right;">${basePrice}</td></tr>
              <tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Booking Fee</td><td style="color:#0a2540;font-weight:600;text-align:right;padding:5px;">${bookingFee}</td></tr>
              ${smsConfirmation !== 'No' ? `<tr><td style="color:#555;">SMS Confirmation</td><td style="color:#0a2540;font-weight:600;text-align:right;">+£0.99</td></tr>` : ''}
              ${cancellationCover !== 'No' ? `<tr style="background:#fafafa;"><td style="color:#555;padding:5px;">Cancellation Cover</td><td style="color:#0a2540;font-weight:600;text-align:right;padding:5px;">+£2.00</td></tr>` : ''}
            </table>

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
              <tr>
                <td style="background:#0a2540;border-radius:10px;padding:16px 20px;">
                  <table width="100%">
                    <tr>
                      <td style="color:#fff;font-size:15px;font-weight:700;">Total Amount</td>
                      <td style="color:#f5a623;font-size:22px;font-weight:900;text-align:right;">${totalAmount}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 30px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;font-size:13px;color:#888;">
              Contact us at <a href="mailto:info@parkingpartner.co.uk" style="color:#f5a623;text-decoration:none;">info@parkingpartner.co.uk</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#aaa;">
              Parking Partner Ltd &bull; United Kingdom<br/>
              &copy; ${new Date().getFullYear()} Parking Partner. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    // Send to customer
    await resend.emails.send({
      from:    `Parking Partner <${FROM_EMAIL}>`,
      to:      customerEmail,
      subject: `Booking Confirmation for ${airport} Parking - Ref ${bookingId}`,
      html:    buildEmail(false),
      headers: {
        'X-Entity-Ref-ID': bookingId,
      },
    });

    // Send to owner
    await resend.emails.send({
      from:     `Parking Partner <${FROM_EMAIL}>`,
      to:       OWNER_EMAIL,
      subject:  `Booking Received - ${airport} - ${customerName} - Ref ${bookingId}`,
      html:     buildEmail(true),
      reply_to: customerEmail,
      headers: {
        'X-Entity-Ref-ID': bookingId,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};