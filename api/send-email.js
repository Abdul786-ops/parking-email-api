// api/send-email.js

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// BASIC EMAIL CONFIGURATION
// ============================================================================

const FROM_EMAIL = 'bookings@parkingpartner.co.uk';
const FROM_NAME = 'Airport Parking';


// ============================================================================
// PACKAGE-BASED EMAIL CONFIGURATION
//
// To add a future package/company, simply add another object here.
// You do NOT need to rebuild or change the email-sending logic.
// ============================================================================

const PACKAGE_EMAIL_CONFIG = {
  'SPS Park & Ride': {
    packageIds: [
      'SPS Park & Ride',
      'SPS',
      'sps',
      'park247',
      'Stansted Parking Services'
    ],

    matchKeys: [
      'SPS Park & Ride',
      'SPS',
      'Park & Ride',
      'park247',
      'Stansted Parking Services'
    ],

    recipients: [
      'stnbookings26@gmail.com',
      'bookingsparkingpartner@gmail.com'
    ]
  },

  'Meet & Greet': {
    packageIds: [
      'Meet & Greet',
      'Secure Park',
      'Stansted Meet & Greet',
      'Elite Meet & Greet',
      'Gatwick Executive',
      'SP Meet'
    ],

    matchKeys: [
      'Meet & Greet',
      'Secure Park',
      'Stansted Meet & Greet',
      'Elite Meet & Greet',
      'Gatwick Executive',
      'SP Meet'
    ],

    recipients: [
      'stanstedparkingspaces@gmail.com',
      'bookingsparkingpartner@gmail.com'
    ]
  }
};


// Default recipient if a future/unknown package is received.
// This prevents an unknown package from incorrectly being treated
// as Meet & Greet.
const DEFAULT_RECIPIENTS = [
  'bookingsparkingpartner@gmail.com'
];


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function safeString(value, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}


function normalize(value) {
  return safeString(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}


/**
 * Finds the correct package configuration.
 *
 * Priority:
 * 1. packageId
 * 2. provider
 * 3. serviceType
 */
function getPackageConfig(provider, serviceType, packageId) {
  const normalizedPackageId = normalize(packageId);
  const normalizedProvider = normalize(provider);
  const normalizedServiceType = normalize(serviceType);

  const configs = Object.entries(PACKAGE_EMAIL_CONFIG);

  // --------------------------------------------------------------------------
  // 1. Try packageId first
  // --------------------------------------------------------------------------

  if (normalizedPackageId) {
    for (const [packageName, config] of configs) {
      const packageIds = config.packageIds || [];

      const matched = packageIds.some(
        id => normalize(id) === normalizedPackageId
      );

      if (matched) {
        return {
          name: packageName,
          ...config
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. Try provider
  // --------------------------------------------------------------------------

  if (normalizedProvider) {
    for (const [packageName, config] of configs) {
      const matchKeys = config.matchKeys || [];

      const matched = matchKeys.some(matchKey =>
        normalizedProvider.includes(normalize(matchKey))
      );

      if (matched) {
        return {
          name: packageName,
          ...config
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // 3. Try service type
  // --------------------------------------------------------------------------

  if (normalizedServiceType) {
    if (
      normalizedServiceType.includes('park & ride') ||
      normalizedServiceType.includes('park and ride')
    ) {
      return {
        name: 'SPS Park & Ride',
        ...PACKAGE_EMAIL_CONFIG['SPS Park & Ride']
      };
    }

    if (
      normalizedServiceType.includes('meet & greet') ||
      normalizedServiceType.includes('meet and greet')
    ) {
      return {
        name: 'Meet & Greet',
        ...PACKAGE_EMAIL_CONFIG['Meet & Greet']
      };
    }
  }

  // --------------------------------------------------------------------------
  // No known package
  // --------------------------------------------------------------------------

  return {
    name: 'Unknown',
    recipients: DEFAULT_RECIPIENTS
  };
}


/**
 * Determines whether this booking is Park & Ride.
 */
function isParkAndRideBooking(provider, serviceType, packageId) {
  const packageConfig = getPackageConfig(
    provider,
    serviceType,
    packageId
  );

  return packageConfig.name === 'SPS Park & Ride';
}


/**
 * Escape dynamic values before inserting them into HTML.
 */
function escapeHtml(value) {
  return safeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/**
 * Format money values safely.
 */
function formatAmount(value) {
  if (value === undefined || value === null || value === '') {
    return '£0.00';
  }

  const stringValue = String(value).trim();

  if (stringValue.startsWith('£')) {
    return stringValue;
  }

  return `£${stringValue}`;
}


// ============================================================================
// MAIN HANDLER
// ============================================================================

module.exports = async function handler(req, res) {

  // --------------------------------------------------------------------------
  // CORS
  // --------------------------------------------------------------------------

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }


  // --------------------------------------------------------------------------
  // REQUEST DATA
  // --------------------------------------------------------------------------

  const {
    customerEmail,
    customerName,
    customerPhone,

    bookingId,
    bookingReference,

    provider,
    airport,
    serviceType,
    packageId,

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

    // These are used for the company email format
    passengers,
    passengerCount,
    valeting,
    bookingStatus,

    // Optional company name if your frontend already sends it
    companyName
  } = req.body || {};


  // --------------------------------------------------------------------------
  // BASIC VALIDATION
  // --------------------------------------------------------------------------

  if (!customerEmail) {
    return res.status(400).json({
      success: false,
      error: 'Customer email is required'
    });
  }

  if (!customerName) {
    return res.status(400).json({
      success: false,
      error: 'Customer name is required'
    });
  }


  // --------------------------------------------------------------------------
  // BOOKING REFERENCE
  // --------------------------------------------------------------------------

  const ref = bookingReference || bookingId || 'N/A';


  // --------------------------------------------------------------------------
  // PACKAGE DETECTION
  // --------------------------------------------------------------------------

  const packageConfig = getPackageConfig(
    provider,
    serviceType,
    packageId
  );

  const recipients = packageConfig.recipients || DEFAULT_RECIPIENTS;

  const isParkAndRide =
    packageConfig.name === 'SPS Park & Ride';

  const finalServiceType =
    serviceType ||
    (isParkAndRide ? 'Park & Ride' : 'Meet & Greet');


  // --------------------------------------------------------------------------
  // COMPANY DETAILS
  // --------------------------------------------------------------------------

  const finalCompanyName =
    companyName ||
    provider ||
    (isParkAndRide
      ? 'Stansted Parking Services'
      : 'Stansted Parking Spaces');


  const finalPassengers =
    passengerCount !== undefined
      ? passengerCount
      : passengers !== undefined
        ? passengers
        : '1';


  const finalValeting =
    valeting !== undefined && valeting !== ''
      ? valeting
      : 'No';


  const finalBookingStatus =
    bookingStatus ||
    'Completed';


  // ==========================================================================
  // INSTRUCTIONS
  // ==========================================================================

  const meetGreetInstructions = `*Customer Parking Instructions*

*Service Provider Contact*

Telephone: *07349851320*

Please keep this number with you throughout your journey, as you will need to contact the parking provider before arrival and when returning to the airport.

Important Information

* An airport levy of £13 each way is payable directly to the service provider and is not included in your parking price.
* Please pay the £13 entry fee at the payment machine before handing your car park ticket and vehicle keys to the driver.
* You only need to hand over the ignition key and any relevant security fobs. Please keep all other keys with you.
* Please remove all valuables and personal belongings from your vehicle before handing over the keys.
* Please ensure you have all necessary personal items with you before leaving the vehicle.

Arrival & Drop-Off Procedure

Please call *07349851320* when you are approximately 30 minutes away from Stansted Airport.

This allows the service provider to prepare for your arrival and helps minimise waiting times.

Important: Arriving without prior notice may result in a wait of up to 30 minutes and may also result in additional car park charges.

Departure Location

Short Stay Green Multi-Storey Car Park
Terminal Road S
Stansted
CM24 1QW

View Google Maps – Departure Location

https://maps.app.goo.gl/wd1it7EvsgnCcEs27?g_st=ic


Once you arrive at the designated location, follow the instructions provided by the service provider and hand over the required keys and car park ticket to the driver.

Return Procedure

After your flight has landed:

1. Collect all your luggage.
2. Clear Customs and make your way out of the terminal.
3. Call *07349851320*.
4. Make your way to the Green Multi-Storey Car Park as instructed by the service provider.
5. Your vehicle will be prepared and should be ready for collection within approximately 30 minutes.

Please allow additional time during busy periods or if there are unforeseen delays.

Changes to Your Arrival or Return

Early or Late Drop-Off

If you need to arrive earlier or later than your booked time, please provide the service provider with at least 2–3 hours’ notice.

While the provider will do its best to accommodate changes, delays may occur if insufficient notice is given.

Early or Late Return

If your return flight or collection time changes, please provide at least 24 hours’ notice whenever possible.

This helps the provider prepare your vehicle and minimise delays.

Additional Parking Days

If your vehicle remains at the car park beyond the period originally booked, an additional charge of £20 per day will apply.

Please contact the service provider as soon as you know your return date has changed.

Delays

Please be aware that delays may occasionally occur, particularly during busy periods or due to circumstances outside the service provider’s control.

We recommend allowing sufficient time for vehicle handover, airport transfers and vehicle collection when planning your journey.

Vehicle & Personal Belongings

Before handing over your vehicle:

* Remove all valuables and personal belongings.
* Keep all keys that are not required by the parking provider.
* Make sure you have your documents, luggage and other essential items with you.
* Only hand over the ignition key and required security fobs.

Service Provider

This parking service is provided by *Stansted Secure Park Ltd*.

For any issues relating to the actual parking service, please contact the service provider directly on 07349851320.

Disclaimer

ParkingPartner acts solely as a booking comparison and reservation service. Parking services are provided by independent third-party operators.

ParkingPartner does not operate the car park or provide the parking service directly. Any concerns relating to the parking service, including vehicle damage or loss, operational delays, missed flights or service quality, should be raised directly with the relevant parking provider.

Please ensure you read the booking confirmation and applicable terms and conditions before travelling.`;


  const parkAndRideInstructions = `
SERVICE PROVIDER CONTACT
Airport Number: 07783 554877

DROP-OFF PROCEDURE
Please call the service provider 30 minutes before arriving at the car park on 07783 554877 to avoid any delays.

An airport drop-off charge of £10 each way is payable directly to the service provider.

Upon arrival at the car park, you will be checked in and provided with a receipt. Once you are ready to leave your vehicle, one of the minibus drivers will transport you directly to the airport.

DIRECTIONS
EL GRANERO, Bury Lodge Lane, Stansted, CM24 8UQ
https://maps.app.goo.gl/bKp8nsWGNEh2z9ix/

By road:
Leave the M11 at Junction 8A.
Take the A120 East exit towards Colchester.
Exit onto Round Coppice Road.
At the roundabout, take the 1st exit and remain on Round Coppice Road.
At the next roundabout, take the 2nd exit and continue on Round Coppice Road.
At the next roundabout, continue straight onto Bury Lodge Lane.
The destination will be on your left.
If using a Sat-Nav, enter CM24 8UQ.

RETURN PROCEDURE
Once you have returned to the airport and collected your luggage, please call 07783 554877.

The minibus driver will collect you and take you back to the car park. Your vehicle keys will be provided to you at the car park so you can continue your journey home.

AMENDMENTS & CANCELLATIONS
To amend, extend or cancel your booking, please contact ParkingPartner.
Amendments and cancellations can be processed by phone or live chat.
Amendments can be made through Manage Booking up to 24 hours before your departure date.
For amendments required within 24 hours of departure, please contact the service provider directly.
If you have already dropped your vehicle at the car park, any changes must be arranged directly with the service provider.
Cancellations can normally be made up to 72 hours before the drop-off date, subject to the applicable terms and conditions.
Same-day bookings, bookings made within 72 hours of drop-off and certain non-flexible offers may be non-refundable.
A £20 administration fee applies to cancellations.

COMPLAINTS & FEEDBACK
ParkingPartner operates as a price comparison and booking agent and does not own or operate the car parks.
Your contract for the actual parking service is directly with the selected service provider.
For this service, you can contact the provider at: info@park247.co.uk

IMPORTANT INFORMATION
A surcharge of £20 per additional day applies if your vehicle remains at the car park beyond the booked period.
If you are returning earlier or later than your booked date or time, please provide at least 24 hours' notice where possible.
If you need to drop off your vehicle earlier or later than your booked time, please provide at least 2–3 hours' notice.
The parking service is provided by Stansted Parking Services Limited.

PLEASE NOTE
ParkingPartner provides price comparison services only and acts as a booking agent for available parking providers.
The selected service provider is responsible for collecting, parking and returning your vehicle.
Please check the ParkingPartner website for the full Terms & conditions.
`;


  const activeInstructions = isParkAndRide
    ? parkAndRideInstructions
    : meetGreetInstructions;


  // ==========================================================================
  // COMMON HTML HELPERS
  // ==========================================================================

  const h3Style = `
    color:#0a2540;
    font-family:Arial,sans-serif;
    font-size:13px;
    font-weight:700;
    margin:0;
    padding:8px 0 6px 0;
    border-bottom:2px solid #f5a623;
    text-transform:uppercase;
    letter-spacing:0.5px;
  `;


  const row = (label, value) => `
    <tr>
      <td style="
        padding:8px 0;
        font-family:Arial,sans-serif;
        font-size:13px;
        color:#64748b;
        width:40%;
        vertical-align:top;
      ">
        ${escapeHtml(label)}
      </td>

      <td style="
        padding:8px 0;
        font-family:Arial,sans-serif;
        font-size:13px;
        color:#0a2540;
        font-weight:600;
      ">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;


  const rowAlt = (label, value) => `
    <tr style="background:#f8fafc;">
      <td style="
        padding:8px 6px;
        font-family:Arial,sans-serif;
        font-size:13px;
        color:#64748b;
        width:40%;
        vertical-align:top;
      ">
        ${escapeHtml(label)}
      </td>

      <td style="
        padding:8px 6px;
        font-family:Arial,sans-serif;
        font-size:13px;
        color:#0a2540;
        font-weight:600;
      ">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;


  // ==========================================================================
  // CUSTOMER PLAIN TEXT EMAIL
  // ==========================================================================

  const buildCustomerPlainText = () => {

    return `BOOKING CONFIRMED

Dear ${customerName},

Your airport parking booking is confirmed.

BOOKING REFERENCE: ${ref}
Payment Date: ${paymentDate || 'N/A'}

CUSTOMER DETAILS
Name: ${customerName}
Email: ${customerEmail}
Phone: ${customerPhone || 'N/A'}

PARKING DETAILS
Provider: ${provider || 'N/A'}
Airport: ${airport || 'N/A'}
Service Type: ${finalServiceType}
Drop Off: ${dropOffDate || 'N/A'} at ${dropOffTime || 'N/A'}
Pick Up: ${pickUpDate || 'N/A'} at ${pickUpTime || 'N/A'}

${hasFlightDetails ? `FLIGHT DETAILS
Departure Terminal: ${departureTerminal || 'N/A'}
Departure Flight: ${departureFlightNo || 'To be confirmed'}
Arrival Terminal: ${arrivalTerminal || 'N/A'}
Arrival Flight: ${arrivalFlightNo || 'To be confirmed'}

` : ''}${vehicleMake ? `VEHICLE DETAILS
Make: ${vehicleMake}
Model: ${vehicleModel || 'N/A'}
Colour: ${vehicleColor || 'N/A'}
Registration: ${vehicleReg || 'N/A'}

` : ''}PAYMENT SUMMARY
Parking Price: ${formatAmount(basePrice)}
Booking Fee: ${formatAmount(bookingFee)}
${smsConfirmation !== 'No' ? 'SMS Confirmation: +£0.99\n' : ''}${cancellationCover !== 'No' ? 'Cancellation Cover: +£2.00\n' : ''}Total: ${formatAmount(totalAmount)}

CUSTOMER INSTRUCTIONS
=====================

${activeInstructions}

---

Parking Partner acts as a booking comparison and reservation service only.
All parking services are provided by independent third-party operators.

Contact: info@parkingpartner.co.uk
Website: parkingpartner.co.uk
`;
  };


  // ==========================================================================
  // CUSTOMER HTML EMAIL
  // ==========================================================================

  const buildCustomerHtml = () => {

    const flightRows = hasFlightDetails
      ? `
        <tr>
          <td colspan="2" style="padding-top:20px;">
            <h3 style="${h3Style}">Flight Details</h3>
          </td>
        </tr>

        ${row('Departure Terminal', departureTerminal || 'N/A')}
        ${rowAlt('Departure Flight', departureFlightNo || 'To be confirmed')}
        ${row('Arrival Terminal', arrivalTerminal || 'N/A')}
        ${rowAlt('Arrival Flight', arrivalFlightNo || 'To be confirmed')}
      `
      : '';


    const vehicleRows = vehicleMake
      ? `
        <tr>
          <td colspan="2" style="padding-top:20px;">
            <h3 style="${h3Style}">Vehicle Details</h3>
          </td>
        </tr>

        ${row('Make', vehicleMake)}
        ${rowAlt('Model', vehicleModel || 'N/A')}
        ${row('Colour', vehicleColor || 'N/A')}

        <tr>
          <td style="
            padding:8px 0;
            font-family:Arial,sans-serif;
            font-size:13px;
            color:#64748b;
            width:40%;
          ">
            Registration
          </td>

          <td style="
            padding:8px 0;
            font-family:Arial,sans-serif;
            font-size:13px;
            color:#0a2540;
            font-weight:600;
            text-transform:uppercase;
          ">
            ${escapeHtml(vehicleReg || 'N/A')}
          </td>
        </tr>
      `
      : '';


    const instructionsHtml = activeInstructions
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(line => `
        <p style="
          margin:0 0 8px 0;
          font-size:13px;
          color:#444;
          line-height:1.6;
        ">
          ${escapeHtml(line)}
        </p>
      `)
      .join('');


    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Booking Confirmed - Parking Partner</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f0f2f5;
  font-family:Georgia,Times,'Times New Roman',serif;
">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:24px 0;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
        style="
          background:#ffffff;
          border-radius:12px;
          overflow:hidden;
          box-shadow:0 2px 12px rgba(0,0,0,0.08);
          max-width:600px;
        ">

        <!-- HEADER -->

        <tr>
          <td style="
            background:#0a2540;
            padding:28px 32px;
            text-align:center;
          ">

            <p style="
              margin:0 0 4px 0;
              font-family:Arial,sans-serif;
              font-size:22px;
              font-weight:900;
              color:#f5a623;
              letter-spacing:1px;
            ">
              🏷️ COMPARE YOUR PARKING
            </p>

            <p style="
              margin:0;
              font-family:Arial,sans-serif;
              font-size:13px;
              color:#94a3b8;
            ">
              Booking Confirmation
            </p>

          </td>
        </tr>


        <!-- BODY -->

        <tr>
          <td style="padding:28px 32px;">

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

              <tr>
                <td style="padding-bottom:20px;">

                  <p style="
                    margin:0;
                    font-size:15px;
                    color:#1e293b;
                    line-height:1.6;
                  ">
                    Dear ${escapeHtml(customerName)},<br>
                    Your airport parking booking is confirmed.
                  </p>

                </td>
              </tr>


              <!-- BOOKING REFERENCE -->

              <tr>
                <td style="padding-bottom:20px;">

                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                    style="
                      background:#f0f7ff;
                      border-radius:8px;
                      padding:16px;
                    ">

                    <tr>

                      <td>

                        <p style="
                          margin:0;
                          font-size:11px;
                          color:#64748b;
                          text-transform:uppercase;
                          letter-spacing:0.8px;
                          font-family:Arial,sans-serif;
                        ">
                          Booking Reference
                        </p>

                        <p style="
                          margin:4px 0 0;
                          font-size:22px;
                          font-weight:700;
                          color:#0a2540;
                          font-family:Arial,sans-serif;
                          letter-spacing:1px;
                        ">
                          ${escapeHtml(ref)}
                        </p>

                      </td>

                      <td align="right" style="vertical-align:top;">

                        <p style="
                          margin:0;
                          font-size:11px;
                          color:#64748b;
                          font-family:Arial,sans-serif;
                        ">
                          Payment Date
                        </p>

                        <p style="
                          margin:4px 0 0;
                          font-size:12px;
                          color:#0a2540;
                          font-family:Arial,sans-serif;
                        ">
                          ${escapeHtml(paymentDate || 'N/A')}
                        </p>

                      </td>

                    </tr>

                  </table>

                </td>
              </tr>


              <!-- BOOKING DETAILS -->

              <tr>
                <td>

                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

                    <tr>
                      <td colspan="2">
                        <h3 style="${h3Style}">
                          Booking Details
                        </h3>
                      </td>
                    </tr>

                    ${row('Airport', airport || 'N/A')}
                    ${rowAlt('Drop-off Date/Time', `${dropOffDate || 'N/A'} ${dropOffTime || ''}`)}
                    ${row('Pick-up Date/Time', `${pickUpDate || 'N/A'} ${pickUpTime || ''}`)}
                    ${rowAlt('Service Provider', provider || 'N/A')}
                    ${row('Service Type', finalServiceType)}


                    <tr>
                      <td colspan="2" style="padding-top:20px;">
                        <h3 style="${h3Style}">
                          Customer Details
                        </h3>
                      </td>
                    </tr>

                    ${row('Name', customerName)}
                    ${rowAlt('Contact No', customerPhone || 'N/A')}
                    ${row('Email', customerEmail)}


                    ${vehicleRows}

                    ${flightRows}


                    <tr>
                      <td colspan="2" style="padding-top:20px;">
                        <h3 style="${h3Style}">
                          Payment Details
                        </h3>
                      </td>
                    </tr>

                    ${row('Quote Amount', formatAmount(basePrice))}
                    ${rowAlt('Discount (if applicable)', '£0.00')}
                    ${row('Paid Amount', formatAmount(totalAmount))}
                    ${smsConfirmation !== 'No' ? rowAlt('SMS Confirmation', '+£0.99') : ''}
                    ${cancellationCover !== 'No' ? row('Cancellation Cover', '+£2.00') : ''}


                    <!-- TOTAL -->

                    <tr>
                      <td colspan="2" style="padding-top:12px;">

                        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                          style="
                            background:#0a2540;
                            border-radius:8px;
                            padding:14px 16px;
                          ">

                          <tr>

                            <td style="
                              font-family:Arial,sans-serif;
                              font-size:14px;
                              font-weight:700;
                              color:#ffffff;
                            ">
                              Total Amount
                            </td>

                            <td style="
                              font-family:Arial,sans-serif;
                              font-size:20px;
                              font-weight:900;
                              color:#f5a623;
                              text-align:right;
                            ">
                              ${escapeHtml(formatAmount(totalAmount))}
                            </td>

                          </tr>

                        </table>

                      </td>
                    </tr>


                    <!-- CUSTOMER INSTRUCTIONS -->

                    <tr>
                      <td colspan="2" style="padding-top:24px;">

                        <table width="100%" cellpadding="0" cellspacing="0"
                          style="
                            background:#fff8ed;
                            border-left:4px solid #f5a623;
                            border-radius:0 8px 8px 0;
                            padding:20px;
                          ">

                          <tr>
                            <td>

                              <h3 style="
                                color:#0a2540;
                                margin:0 0 12px 0;
                                font-size:15px;
                              ">
                                ${isParkAndRide
                                  ? 'Park & Ride Instructions'
                                  : 'Meet & Greet Instructions'}
                              </h3>

                              ${instructionsHtml}

                            </td>
                          </tr>

                        </table>

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
          <td style="
            background:#f5a623;
            padding:20px 32px;
            text-align:center;
          ">

            <p style="
              margin:0;
              font-family:Arial,sans-serif;
              font-size:13px;
              color:#0a2540;
              font-weight:700;
            ">
              Copyright © ${new Date().getFullYear()} Compare Your Parking. All rights reserved.
            </p>

          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
  };


  // ==========================================================================
  // COMPANY EMAIL - MATCHES THE PROVIDED SCREENSHOT FORMAT
  //
  // Example:
  //
  // Airport: Stansted
  // Reference Code: AD-1-414869
  // Company Name: Express Parking STN
  // Name: Mr Antonis Petrou-Amerikanos
  // Contact No: 07760227786
  // Model: Auris
  // Make: Toyota
  // Colour: Silver
  // Registration No.: RE68XWC
  // Departure Date/Time: 12-September-2026 16:00
  // Departure Terminal: Main Terminal
  // Departure Flight no: FR2567
  // Arrival Date/Time: 17-September-2026 17:00
  // Arrival Terminal: Main Terminal
  // Arrival Flight no: FR2568
  // Passengers: 1
  // Valeting: No
  // Amount: £75.99
  // Booking Status: Completed
  //
  // ==========================================================================

  const buildCompanyPlainText = () => {

    return `New Booking Ref. No

Airport: ${airport || 'N/A'}
Reference Code: ${ref}
Company Name: ${finalCompanyName}
Name: ${customerName}
Contact No: ${customerPhone || 'N/A'}
Model: ${vehicleModel || 'N/A'}
Make: ${vehicleMake || 'N/A'}
Colour: ${vehicleColor || 'N/A'}
Registration No.: ${vehicleReg || 'N/A'}
Departure Date/Time: ${dropOffDate || 'N/A'} ${dropOffTime || ''}
Departure Terminal: ${departureTerminal || 'N/A'}
Departure Flight no: ${departureFlightNo || 'N/A'}
Arrival Date/Time: ${pickUpDate || 'N/A'} ${pickUpTime || ''}
Arrival Terminal: ${arrivalTerminal || 'N/A'}
Arrival Flight no: ${arrivalFlightNo || 'N/A'}
Passengers: ${finalPassengers}
Valeting: ${finalValeting}
Amount: ${formatAmount(totalAmount)}
Booking Status: ${finalBookingStatus}
`;
  };


  // ==========================================================================
  // COMPANY HTML EMAIL
  // ==========================================================================

  const buildCompanyHtml = () => {

    const companyRow = (label, value, alternate = false) => `
      <tr${alternate ? ' style="background:#f8fafc;"' : ''}>

        <td style="
          padding:10px 8px;
          font-family:Arial,sans-serif;
          font-size:14px;
          color:#333333;
          width:42%;
          vertical-align:top;
        ">
          ${escapeHtml(label)}
        </td>

        <td style="
          padding:10px 8px;
          font-family:Arial,sans-serif;
          font-size:14px;
          color:#111111;
          font-weight:600;
          vertical-align:top;
        ">
          ${escapeHtml(value)}
        </td>

      </tr>
    `;


    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">

  <title>
    New Booking Ref. No ${escapeHtml(ref)}
  </title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#ffffff;
  font-family:Arial,Helvetica,sans-serif;
  color:#111111;
">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">

  <tr>
    <td style="padding:30px 20px;">

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        role="presentation"
        style="
          max-width:700px;
          margin:0 auto;
          border:1px solid #dddddd;
          background:#ffffff;
        "
      >

        <!-- TITLE -->

        <tr>
          <td style="
            padding:22px 24px;
            border-bottom:1px solid #dddddd;
          ">

            <h1 style="
              margin:0;
              font-size:24px;
              line-height:1.3;
              color:#111111;
              font-weight:700;
            ">
              New Booking Ref. No
            </h1>

            <p style="
              margin:8px 0 0;
              font-size:18px;
              color:#111111;
              font-weight:700;
            ">
              [${escapeHtml(ref)}]
            </p>

          </td>
        </tr>


        <!-- BOOKING INFORMATION -->

        <tr>
          <td style="padding:20px 24px;">

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
            >

              ${companyRow('Airport', airport || 'N/A')}
              ${companyRow('Reference Code', ref, true)}
              ${companyRow('Company Name', finalCompanyName)}
              ${companyRow('Name', customerName, true)}
              ${companyRow('Contact No', customerPhone || 'N/A')}

              ${companyRow('Model', vehicleModel || 'N/A', true)}
              ${companyRow('Make', vehicleMake || 'N/A')}
              ${companyRow('Colour', vehicleColor || 'N/A', true)}
              ${companyRow('Registration No.', vehicleReg || 'N/A')}

              ${companyRow(
                'Departure Date/Time',
                `${dropOffDate || 'N/A'} ${dropOffTime || ''}`,
                true
              )}

              ${companyRow(
                'Departure Terminal',
                departureTerminal || 'N/A'
              )}

              ${companyRow(
                'Departure Flight no',
                departureFlightNo || 'N/A',
                true
              )}

              ${companyRow(
                'Arrival Date/Time',
                `${pickUpDate || 'N/A'} ${pickUpTime || ''}`
              )}

              ${companyRow(
                'Arrival Terminal',
                arrivalTerminal || 'N/A',
                true
              )}

              ${companyRow(
                'Arrival Flight no',
                arrivalFlightNo || 'N/A'
              )}

              ${companyRow(
                'Passengers',
                finalPassengers,
                true
              )}

              ${companyRow(
                'Valeting',
                finalValeting
              )}

              ${companyRow(
                'Amount',
                formatAmount(totalAmount),
                true
              )}

              ${companyRow(
                'Booking Status',
                finalBookingStatus
              )}

            </table>

          </td>
        </tr>


        <!-- FOOTER -->

        <tr>
          <td style="
            padding:16px 24px;
            border-top:1px solid #dddddd;
            font-size:12px;
            color:#777777;
          ">

            Parking Partner Booking System

          </td>
        </tr>

      </table>

    </td>
  </tr>

</table>

</body>
</html>`;
  };


  // ==========================================================================
  // SEND EMAILS
  // ==========================================================================

  try {

    // ------------------------------------------------------------------------
    // Customer confirmation
    // ------------------------------------------------------------------------

    const customerSubject =
      `Booking Confirmed: ${airport || 'Airport'} ${finalServiceType} — Ref ${ref}`;


    const customerResult = await resend.emails.send({

      from: `${FROM_NAME} <${FROM_EMAIL}>`,

      to: customerEmail,

      subject: customerSubject,

      html: buildCustomerHtml(),

      text: buildCustomerPlainText(),

      reply_to: FROM_EMAIL,

      headers: {
        'X-Entity-Ref-ID': String(ref),

        'List-Unsubscribe':
          '<mailto:unsubscribe@parkingpartner.co.uk?subject=unsubscribe>',

        'List-Unsubscribe-Post':
          'List-Unsubscribe=One-Click'
      }

    });


    // ------------------------------------------------------------------------
    // Company booking notification
    //
    // IMPORTANT:
    // `to` receives ALL configured package recipients.
    //
    // SPS Park & Ride:
    //   stnbookings26@gmail.com
    //   bookingsparkingpartner@gmail.com
    //
    // Meet & Greet:
    //   stanstedparkingspaces@gmail.com
    //   bookingsparkingpartner@gmail.com
    // ------------------------------------------------------------------------

    const companySubject =
      `New Booking Ref. No [${ref}]`;


    const companyResult = await resend.emails.send({

      from: `${FROM_NAME} <${FROM_EMAIL}>`,

      to: recipients,

      subject: companySubject,

      html: buildCompanyHtml(),

      text: buildCompanyPlainText(),

      reply_to: FROM_EMAIL,

      headers: {
        'X-Entity-Ref-ID': String(ref),

        'List-Unsubscribe':
          '<mailto:unsubscribe@parkingpartner.co.uk?subject=unsubscribe>',

        'List-Unsubscribe-Post':
          'List-Unsubscribe=One-Click'
      }

    });


    // ------------------------------------------------------------------------
    // Check Resend responses
    // ------------------------------------------------------------------------

    if (customerResult && customerResult.error) {
      throw new Error(
        `Customer email failed: ${customerResult.error.message || JSON.stringify(customerResult.error)}`
      );
    }


    if (companyResult && companyResult.error) {
      throw new Error(
        `Company email failed: ${companyResult.error.message || JSON.stringify(companyResult.error)}`
      );
    }


    // ------------------------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------------------------

    console.log('Booking emails sent successfully.', {
      bookingReference: ref,
      package: packageConfig.name,
      recipients
    });


    return res.status(200).json({

      success: true,

      message: 'Booking emails sent successfully',

      package: packageConfig.name,

      recipients,

      customerEmail,

      bookingReference: ref

    });

  } catch (error) {

    console.error('Booking email error:', error);

    return res.status(500).json({

      success: false,

      error: error.message || 'Failed to send booking emails'

    });

  }

};
