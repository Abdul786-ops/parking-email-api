// api/send-email.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── CONFIG ────────────────────────────────────────────────────────────────
// IMPORTANT: Use a subdomain for transactional emails — protects root domain reputation
// Set up DNS records for mail.parkingpartner.co.uk:
//   SPF  → TXT  "v=spf1 include:amazonses.com ~all"   (Resend uses SES under the hood)
//   DKIM → provided by Resend dashboard — add the CNAME records they give you
//   DMARC→ TXT  "v=DMARC1; p=none; rua=mailto:dmarc@parkingpartner.co.uk"
const OWNER_EMAIL = 'info@parkingpartner.co.uk';
const FROM_EMAIL  = 'bookings@parkingpartner.co.uk'; // named subdomain address, not noreply
const FROM_NAME   = 'Parking Partner Bookings';
// ───────────────────────────────────────────────────────────────────────────

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

  const ref = bookingReference || bookingId;

  // ── Plain-text versions (boosts deliverability significantly) ─────────────
  const buildPlainText = (isOwner) => {
    const intro = isOwner
      ? `NEW BOOKING RECEIVED\n\nA new booking has been made by ${customerName}.\n`
      : `BOOKING CONFIRMED\n\nDear ${customerName},\n\nYour airport parking booking is confirmed.\n`;

    return `${intro}
BOOKING REFERENCE: ${ref}
Date: ${paymentDate}

CUSTOMER DETAILS
Name:   ${customerName}
Email:  ${customerEmail}
Phone:  ${customerPhone}

PARKING DETAILS
Provider:  ${provider}
Airport:   ${airport}
Drop Off:  ${dropOffDate} at ${dropOffTime}
Pick Up:   ${pickUpDate} at ${pickUpTime}

${hasFlightDetails ? `FLIGHT DETAILS
Departure Terminal: ${departureTerminal}
Departure Flight:   ${departureFlightNo || 'To be confirmed'}
Arrival Terminal:   ${arrivalTerminal}
Arrival Flight:     ${arrivalFlightNo || 'To be confirmed'}

` : ''}${vehicleMake ? `VEHICLE DETAILS
Make:         ${vehicleMake}
Model:        ${vehicleModel}
Colour:       ${vehicleColor}
Registration: ${vehicleReg}

` : ''}PAYMENT SUMMARY
Parking Price:     ${basePrice}
Booking Fee:       ${bookingFee}${smsConfirmation !== 'No' ? '\nSMS Confirmation:  +£0.99' : ''}${cancellationCover !== 'No' ? '\nCancellation Cover: +£2.00' : ''}
Total:             ${totalAmount}

${!isOwner ? `IMPORTANT INFORMATION

- Airport levy charges of £13 each way are not included in the parking price.
- Please keep all keys except the ignition key and any relevant security fobs.
- Pay the £13.00 entry fee at the payment machine before handing over your keys.

CALL US: Please call 07907658823 when you are 30 minutes away from the airport.
Arriving without notice may result in a 30-minute wait and additional car park charges.

DEPARTURE: Short Stay Orange Car Park, Terminal Rd S, Stansted, CM24 1QW

RETURN: After collecting all luggage and clearing Customs, call 07907658823.
Make your way to the ORANGE car park, Rows A-H. Your vehicle will be ready within 30 minutes.

This service is provided by Park Compare Limited.

---
Parking Partner acts as a booking comparison and reservation service only.
All parking services are provided by independent third-party operators.
Contact: info@parkingpartner.co.uk | parkingpartner.co.uk
` : `---
Contact: info@parkingpartner.co.uk | parkingpartner.co.uk
`}`;
  };

  // ── HTML email builder ────────────────────────────────────────────────────
  const buildHtml = (isOwner) => {
    // Only use absolute URLs matching parkingpartner.co.uk — mismatched domains trigger spam
    const websiteUrl = 'https://www.parkingpartner.co.uk';
    const logoUrl    = `${websiteUrl}/logo.png`; // host your logo on your own domain

    const flightRows = hasFlightDetails ? `
      <tr><td colspan="2" style="padding-top:20px;"><h3 style="${h3Style}">Flight Details</h3></td></tr>
      ${row('Departure Terminal', departureTerminal)}
      ${rowAlt('Departure Flight', departureFlightNo || 'To be confirmed')}
      ${row('Arrival Terminal', arrivalTerminal)}
      ${rowAlt('Arrival Flight', arrivalFlightNo || 'To be confirmed')}
    ` : '';

    const vehicleRows = vehicleMake ? `
      <tr><td colspan="2" style="padding-top:20px;"><h3 style="${h3Style}">Vehicle Details</h3></td></tr>
      ${row('Make', vehicleMake)}
      ${rowAlt('Model', vehicleModel)}
      ${row('Colour', vehicleColor)}
      ${rowAlt('Registration', `<span style="text-transform:uppercase;">${vehicleReg}</span>`)}
    ` : '';

    const customerInstructions = !isOwner ? `
      <tr><td colspan="2" style="padding-top:24px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#fff8ed;border-left:4px solid #f5a623;border-radius:0 8px 8px 0;padding:20px;">
          <tr><td>
            <h3 style="color:#0a2540;margin:0 0 12px 0;font-size:15px;">Important Information</h3>
            <p style="margin:0 0 8px 0;font-size:13px;color:#444;line-height:1.6;">
              Airport levy charges of £13 each way are <strong>not</strong> included in the parking price.
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#444;line-height:1.6;">
              You are only required to hand over the ignition key and any relevant security fobs.
              Please keep all other keys.
            </p>
            <p style="margin:0 0 16px 0;font-size:13px;color:#444;line-height:1.6;">
              Please pay the entry fee of £13.00 at the payment machine before handing over
              your keys and car park ticket to the driver.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#0a2540;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
              <tr>
                <td style="color:#f5a623;font-size:14px;font-weight:700;">
                  Please call 07907658823 when you are 30 minutes away from the airport.
                </td>
              </tr>
              <tr>
                <td style="color:#ccc;font-size:12px;padding-top:6px;">
                  Arriving without prior notice may result in a 30-minute wait and additional car park charges.
                </td>
              </tr>
            </table>

            <h4 style="color:#0a2540;margin:0 0 8px 0;font-size:13px;">Departure Location</h4>
            <p style="margin:0 0 16px 0;font-size:13px;color:#444;line-height:1.6;">
              Short Stay Orange Car Park<br/>
              Terminal Rd S, Stansted, CM24 1QW<br/>
              <a href="https://maps.app.goo.gl/eqsoQTsRrguyNeSn9"
                style="color:#f5a623;text-decoration:none;">View on Google Maps</a>
            </p>

            <h4 style="color:#0a2540;margin:0 0 8px 0;font-size:13px;">Return Procedure</h4>
            <p style="margin:0 0 16px 0;font-size:13px;color:#444;line-height:1.6;">
              After collecting all luggage and clearing Customs, call us on <strong>07907658823</strong>.
              Make your way to <strong>ORANGE car park, Rows A&ndash;H</strong>.
              Your vehicle will be ready within 30 minutes.
            </p>

            <h4 style="color:#0a2540;margin:0 0 8px 0;font-size:13px;">Additional Information</h4>
            <ul style="margin:0;padding-left:18px;color:#444;font-size:13px;line-height:1.8;">
              <li>Delays may occur during busy periods or unforeseen circumstances.</li>
              <li>Early/late drop-off requires 2&ndash;3 hours notice.</li>
              <li>Early/late returns require at least 24 hours notice.</li>
              <li>Additional days beyond the booking period are charged at £20/day.</li>
              <li>Please remove all valuables from your vehicle before handing over keys.</li>
            </ul>

            <p style="margin:16px 0 0 0;font-size:13px;color:#666;font-style:italic;">
              This service is provided by Park Compare Limited.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <tr><td colspan="2" style="padding-top:20px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#f4f6f9;border-radius:8px;padding:16px;">
          <tr><td>
            <p style="margin:0 0 6px 0;font-size:12px;color:#888;font-weight:700;
              text-transform:uppercase;letter-spacing:0.5px;">Disclaimer</p>
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              Parking Partner acts solely as a booking comparison and reservation service.
              All parking services are provided by independent third-party operators.
              We are not responsible for vehicle damage or loss, operational delays,
              missed flights, or service quality. All service-related issues must be raised
              directly with the parking provider.
            </p>
          </td></tr>
        </table>
      </td></tr>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${isOwner ? 'New Booking' : 'Booking Confirmed'} — Parking Partner</title>
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
          font-weight:900;color:#f5a623;letter-spacing:1px;">Parking Partner</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#94a3b8;">
          ${isOwner ? 'New Booking Received' : 'Booking Confirmation'}
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:28px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

          <!-- Intro -->
          <tr><td style="padding-bottom:20px;">
            <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.6;">
              ${isOwner
                ? `A new booking has been received from <strong>${customerName}</strong>.`
                : `Dear ${customerName},<br/>Your airport parking booking is confirmed.`}
            </p>
          </td></tr>

          <!-- Booking Reference -->
          <tr><td style="padding-bottom:20px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
              style="background:#f0f7ff;border-radius:8px;padding:16px;">
              <tr>
                <td>
                  <p style="margin:0;font-size:11px;color:#64748b;
                    text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">
                    Booking Reference
                  </p>
                  <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#0a2540;
                    font-family:Arial,sans-serif;letter-spacing:1px;">
                    ${ref}
                  </p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <p style="margin:0;font-size:11px;color:#64748b;font-family:Arial,sans-serif;">
                    Payment Date
                  </p>
                  <p style="margin:4px 0 0;font-size:12px;color:#0a2540;font-family:Arial,sans-serif;">
                    ${paymentDate}
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Details table -->
          <tr><td>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

              <tr><td colspan="2"><h3 style="${h3Style}">Customer Details</h3></td></tr>
              ${row('Name', customerName)}
              ${rowAlt('Email', customerEmail)}
              ${row('Phone', customerPhone)}

              <tr><td colspan="2" style="padding-top:20px;">
                <h3 style="${h3Style}">Parking Details</h3>
              </td></tr>
              ${row('Provider', provider)}
              ${rowAlt('Airport', airport)}
              ${row('Drop Off', `${dropOffDate} at ${dropOffTime}`)}
              ${rowAlt('Pick Up', `${pickUpDate} at ${pickUpTime}`)}

              ${flightRows}
              ${vehicleRows}

              <tr><td colspan="2" style="padding-top:20px;">
                <h3 style="${h3Style}">Payment Summary</h3>
              </td></tr>
              ${row('Parking Price', basePrice)}
              ${rowAlt('Booking Fee', bookingFee)}
              ${smsConfirmation !== 'No' ? row('SMS Confirmation', '+£0.99') : ''}
              ${cancellationCover !== 'No' ? rowAlt('Cancellation Cover', '+£2.00') : ''}

              <!-- Total row -->
              <tr><td colspan="2" style="padding-top:12px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                  style="background:#0a2540;border-radius:8px;padding:14px 16px;">
                  <tr>
                    <td style="font-family:Arial,sans-serif;font-size:14px;
                      font-weight:700;color:#ffffff;">Total Amount</td>
                    <td style="font-family:Arial,sans-serif;font-size:20px;font-weight:900;
                      color:#f5a623;text-align:right;">${totalAmount}</td>
                  </tr>
                </table>
              </td></tr>

              ${customerInstructions}

            </table>
          </td></tr>

        </table>
      </td>
    </tr>

    <!-- Footer — unsubscribe link is important for deliverability compliance -->
    <tr>
      <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;
        text-align:center;">
        <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;">
          Questions? Email us at
          <a href="mailto:info@parkingpartner.co.uk"
            style="color:#f5a623;text-decoration:none;">info@parkingpartner.co.uk</a>
        </p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;">
          Parking Partner &bull; United Kingdom &bull;
          <a href="https://www.parkingpartner.co.uk" style="color:#cbd5e1;">parkingpartner.co.uk</a>
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
  };

  // Shared style constants (defined outside template literal so they're available inside)
  const h3Style = `color:#0a2540;font-family:Arial,sans-serif;font-size:13px;font-weight:700;
    margin:0;padding:8px 0 6px 0;border-bottom:2px solid #f5a623;text-transform:uppercase;
    letter-spacing:0.5px;`;

  const row = (label, value) => `
    <tr>
      <td style="padding:8px 0;font-family:Arial,sans-serif;font-size:13px;
        color:#64748b;width:40%;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-family:Arial,sans-serif;font-size:13px;
        color:#0a2540;font-weight:600;">${value}</td>
    </tr>`;

  const rowAlt = (label, value) => `
    <tr style="background:#f8fafc;">
      <td style="padding:8px 6px;font-family:Arial,sans-serif;font-size:13px;
        color:#64748b;width:40%;vertical-align:top;">${label}</td>
      <td style="padding:8px 6px;font-family:Arial,sans-serif;font-size:13px;
        color:#0a2540;font-weight:600;">${value}</td>
    </tr>`;

  try {
    const customerSubject = `Booking Confirmed: ${airport} Parking — Ref ${ref}`;
    const ownerSubject    = `New Booking: ${airport} — ${customerName} — Ref ${ref}`;

    // Send to customer
    await resend.emails.send({
      from:     `${FROM_NAME} <${FROM_EMAIL}>`,
      to:       customerEmail,
      subject:  customerSubject,
      html:     buildHtml(false),
      text:     buildPlainText(false),   // plain-text alternative — critical for deliverability
      reply_to: FROM_EMAIL,              // valid reply-to, not noreply
      headers: {
        'X-Entity-Ref-ID': ref,
        // List-Unsubscribe helps Gmail/Outlook trust the email
        'List-Unsubscribe': `<mailto:unsubscribe@parkingpartner.co.uk?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    // Send to owner
    await resend.emails.send({
      from:     `${FROM_NAME} <${FROM_EMAIL}>`,
      to:       OWNER_EMAIL,
      subject:  ownerSubject,
      html:     buildHtml(true),
      text:     buildPlainText(true),
      reply_to: customerEmail,           // owner can reply directly to customer
      headers: {
        'X-Entity-Ref-ID': ref,
      },
    });

    return res.status(200).json({ success: true, message: 'Emails sent successfully' });

  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
