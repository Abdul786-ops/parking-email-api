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

// api/send-email.js

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Owner email (you)
const OWNER_EMAIL = 'Info@parkingpartner.co.uk';

// ✅ Use Resend test domain (no domain needed)
const FROM_EMAIL  = 'noreply@parkingpartner.co.uk';

module.exports = async function handler(req, res) {
  // ── CORS ─────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  // ── Email HTML ───────────────────────────────────────
  const buildEmail = (isOwner) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
<tr><td align="center">

<table width="600" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

<tr>
<td style="background:#0a2540;padding:30px;text-align:center;">
<h1 style="color:#f5a623;margin:0;">Parking Partner</h1>
<p style="color:#fff;">
${isOwner ? 'New Booking Received' : 'Your Booking is Confirmed'}
</p>
</td>
</tr>

<tr>
<td style="padding:30px;">

<h2>Booking Reference: ${bookingId}</h2>
<p><strong>Name:</strong> ${customerName}</p>
<p><strong>Email:</strong> ${customerEmail}</p>
<p><strong>Phone:</strong> ${customerPhone}</p>

<hr/>

<h3>Parking Details</h3>
<p><strong>Provider:</strong> ${provider}</p>
<p><strong>Airport:</strong> ${airport}</p>
<p><strong>Drop Off:</strong> ${dropOffDate} ${dropOffTime}</p>
<p><strong>Pick Up:</strong> ${pickUpDate} ${pickUpTime}</p>

${hasFlightDetails ? `
<hr/>
<h3>Flight Details</h3>
<p>${departureTerminal} / ${departureFlightNo || ''}</p>
<p>${arrivalTerminal} / ${arrivalFlightNo || ''}</p>
` : ''}

${vehicleMake ? `
<hr/>
<h3>Vehicle</h3>
<p>${vehicleMake} ${vehicleModel} (${vehicleColor})</p>
<p>${vehicleReg}</p>
` : ''}

<hr/>
<h3>Total Paid: ${totalAmount}</h3>

</td>
</tr>

<tr>
<td style="text-align:center;padding:20px;color:#777;font-size:12px;">
© ${new Date().getFullYear()} Parking Partner
</td>
</tr>

</table>

</td></tr>
</table>
</body>
</html>
`;

  try {
    // ✅ Send to CUSTOMER
    await resend.emails.send({
      from: `Parking Partner <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Booking Confirmed – ${provider} (${bookingId})`,
      html: buildEmail(false),
    });

    // ✅ Send to YOU (OWNER)
    await resend.emails.send({
      from: `Parking Partner <${FROM_EMAIL}>`,
      to: OWNER_EMAIL,
      subject: `New Booking – ${customerName} (${bookingId})`,
      html: buildEmail(true),
      reply_to: customerEmail,
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};