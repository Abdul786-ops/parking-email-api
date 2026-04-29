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
    bookingReference,
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
                  <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#0a2540;">${bookingReference || bookingId}</p>
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

            ${!isOwner ? `
            <!-- CUSTOMER SPECIFIC INSTRUCTIONS -->
            <div style="background:#fff3e0;border-left:4px solid #f5a623;padding:20px;margin:24px 0;border-radius:8px;">
              <h3 style="color:#0a2540;margin:0 0 12px 0;">Thank you for choosing Park Compare Limited</h3>
              
              <div style="color:#d97706;font-size:14px;margin:0 0 16px 0;font-weight:600;">
                ⚠️ Important Information:
              </div>
              
              <ul style="margin:0;padding-left:20px;color:#333;font-size:14px;line-height:1.6;">
                <li>Airport levy charges of £13 each way is not included in the parking price.</li>
                <li>You are only required to hand over the ignition key and any relevant security fobs — please keep all other keys.</li>
                <li>Please pay entry fee of £13.00 at the payment machine before handing over the keys and carpark ticket to the driver.</li>
              </ul>
              
              <p style="font-weight:600;margin:20px 0 10px 0;">Please find the parking procedures below to ensure a smooth and hassle-free experience.</p>
              
              <div style="background:#0a2540;color:#fff;padding:12px;border-radius:8px;margin:16px 0;">
                <strong>📞 *Please call 07907658823 when you are 30 minutes away from the airport.*</strong>
                <p style="margin:8px 0 0 0;font-size:12px;color:#f5a623;">Arriving without prior notice may result in a 30-minute wait and additional car park charges.</p>
              </div>
              
              <h4 style="color:#0a2540;margin:20px 0 10px 0;">Departure Procedure:</h4>
              <div style="background:#f0f7ff;background:#e8f0fe;padding:12px;border-radius:8px;margin:10px 0;">
                <strong>Short Stay Orange Car Park</strong><br/>
                Terminal Rd S, Stansted, CM24 1QW<br/>
                <a href="https://maps.app.goo.gl/eqsoQTsRrguyNeSn9" style="color:#f5a623;">https://maps.app.goo.gl/eqsoQTsRrguyNeSn9</a>
              </div>
              
              <h4 style="color:#0a2540;margin:20px 0 10px 0;">Arrival procedure:</h4>
              <div style="background:#e8f0fe;padding:12px;border-radius:8px;margin:10px 0;">
                After you have collected all of your entire luggage, and you are completely through Customs only then call us on: <strong>07907658823</strong>.<br/><br/>
                Please make your way to <strong>ORANGE car park Row "A-H"</strong>. Your vehicle would be delivered within 30 minutes after your phone call.
              </div>
              
              <h4 style="color:#0a2540;margin:20px 0 10px 0;">Additional Information</h4>
              <ul style="margin:0;padding-left:20px;color:#333;font-size:13px;line-height:1.6;">
                <li><strong>Delays:</strong> During busy periods or unforeseen circumstances, delays may occur.</li>
                <li><strong>Early/Late Drop-off:</strong> Requires 2–3 hours' notice.</li>
                <li><strong>Early/Late Returns:</strong> Requires at least 24 hours' notice.</li>
                <li><strong>Additional Charges:</strong> £20/day Fees apply for extra days beyond the booking period.</li>
                <li><strong>Valuables:</strong> Please ensure all valuables are removed from your vehicle before handing over your keys, as the company cannot be held responsible for any loss or damage.</li>
              </ul>
              
              <hr style="margin:20px 0;border-color:#f5a62330;"/>
              
              <p style="font-weight:600;margin:10px 0;">*This service is provided by Park compare Limited.*</p>
              
              <hr style="margin:20px 0;border-color:#f5a62330;"/>
              
              <h4 style="color:#0a2540;margin:20px 0 10px 0;">Disclaimer</h4>
              <p style="margin:0 0 10px 0;"><strong>Parking Partner</strong> acts solely as a booking comparison and reservation service.</p>
              <p style="margin:0 0 10px 0;">All parking services are provided by independent third-party operators.</p>
              <p style="margin:0 0 10px 0;">We are not responsible for:</p>
              <ul style="margin:0;padding-left:20px;color:#333;font-size:13px;line-height:1.6;">
                <li>Vehicle damage or loss</li>
                <li>Operational delays</li>
                <li>Missed flights or transfers</li>
                <li>Service quality or performance</li>
              </ul>
              <p style="margin:10px 0 0 0;font-size:13px;">All service-related issues must be raised directly with the parking provider.</p>
            </div>
            ` : ''}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 30px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;font-size:13px;color:#888;">
              Contact us at <a href="mailto:info@parkingpartner.co.uk" style="color:#f5a623;text-decoration:none;">info@parkingpartner.co.uk</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#aaa;">
              Parking Partner • United Kingdom<br/>
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
      subject: `Booking Confirmation for ${airport} Parking - Ref ${bookingReference || bookingId}`,
      html:    buildEmail(false),
      headers: {
        'X-Entity-Ref-ID': bookingReference || bookingId,
      },
    });

    // Send to owner
    await resend.emails.send({
      from:     `Parking Partner <${FROM_EMAIL}>`,
      to:       OWNER_EMAIL,
      subject:  `Booking Received - ${airport} - ${customerName} - Ref ${bookingReference || bookingId}`,
      html:     buildEmail(true),
      reply_to: customerEmail,
      headers: {
        'X-Entity-Ref-ID': bookingReference || bookingId,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};