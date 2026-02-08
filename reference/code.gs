const SHEET_ID = '1aW9WeovCz7602-125YskFPIQqvf3FgSxCarlX80WyzQ';
const SHEET_NAME = 'Booking'; // change if needed
const PENDING_SHEET_NAME = 'PendingBookings';

// Razorpay credentials are stored in Script Properties for security.
const RAZORPAY_KEY_ID = PropertiesService.getScriptProperties().getProperty('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = PropertiesService.getScriptProperties().getProperty('RAZORPAY_KEY_SECRET') || '';

function doGet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  let data = rows.map(r => Object.fromEntries(r.map((v, i) => [headers[i], v])));
  
  // Filter for aarti dates within the next 30 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  
  if (headers.map(h => String(h).toLowerCase()).indexOf('aartidate') !== -1) {
    data = data.filter(row => {
      const aartiDateValue = row['aartiDate'] || row['Aarti Date'];
      if (!aartiDateValue) return false;
      const aartiDate = new Date(aartiDateValue);
      if (isNaN(aartiDate)) return false;
      aartiDate.setHours(0, 0, 0, 0);
      return aartiDate >= today && aartiDate <= thirtyDaysLater;
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(data))
         .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost handles two flows:
 * 1) Initial booking submission (form POST). If donationAmount > 0, it creates a pending record,
 *    creates a Razorpay order and returns an HTML page that launches the Razorpay checkout.
 * 2) Payment verification (action=verify) — called by the checkout handler after payment. Verifies
 *    signature, finalizes booking (moves from pending to booking sheet) and returns a small HTML response.
 */
function doPost(e) {
  try {
    const params = e.parameter || {};
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const bookingSheet = ss.getSheetByName(SHEET_NAME);

    // Verification callback from Razorpay checkout
    if (params.action === 'verify') {
      const payment_id = params.payment_id || params.razorpay_payment_id;
      const order_id = params.order_id || params.razorpay_order_id;
      const signature = params.signature || params.razorpay_signature;
      const pendingId = params.pendingId;

      if (!payment_id || !order_id || !signature || !pendingId) {
        return HtmlService.createHtmlOutput('Missing verification parameters').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }

      // Verify signature
      const expected = hmacSha256Hex(order_id + '|' + payment_id, RAZORPAY_KEY_SECRET);
      if (expected !== signature) {
        return HtmlService.createHtmlOutput('Signature verification failed').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }

      // Find pending entry
      const pSheet = ss.getSheetByName(PENDING_SHEET_NAME);
      if (!pSheet) return HtmlService.createHtmlOutput('Pending data not found').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      const pData = pSheet.getDataRange().getValues();
      const pHeaders = pData.shift();
      let foundRow = -1;
      for (let i = 0; i < pData.length; i++) {
        if (String(pData[i][0]) === String(pendingId)) { foundRow = i + 2; break; }
      }
      if (foundRow === -1) return HtmlService.createHtmlOutput('Pending entry not found').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      const pendingRowValues = pSheet.getRange(foundRow, 1, 1, pSheet.getLastColumn()).getValues()[0];
      const pendingJson = JSON.parse(pendingRowValues[2] || '{}');

      // Build a row for the booking sheet using its headers (if header exists, map values)
      const bookingHeaders = bookingSheet.getRange(1, 1, 1, bookingSheet.getLastColumn()).getValues()[0].map(h => String(h));
      const bookingRow = bookingHeaders.map(h => {
        if (h === 'Status') return 'CONFIRMED';
        if (pendingJson.hasOwnProperty(h)) return pendingJson[h];
        const lower = h.toLowerCase();
        if (pendingJson[lower]) return pendingJson[lower];
        return '';
      });

      bookingSheet.appendRow(bookingRow);

      // Remove pending row
      pSheet.deleteRow(foundRow);

      return HtmlService.createHtmlOutput('<p>Payment verified and booking confirmed. You may close this window.</p>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // Normal booking submission flow
    // Collect parameters
    const data = {};
    for (const k in params) { if (params.hasOwnProperty(k)) data[k] = params[k]; }

    const donationAmount = parseFloat(data.donationAmount || 0) || 0;

    // If donation provided, create pending and return a checkout page
    if (donationAmount > 0) {
      // Ensure pending sheet exists and has headers: pendingId, timestamp, data
      let pSheet = ss.getSheetByName(PENDING_SHEET_NAME);
      if (!pSheet) {
        pSheet = ss.insertSheet(PENDING_SHEET_NAME);
        pSheet.appendRow(['pendingId','timestamp','data']);
      }

      const pendingId = 'pb_' + Date.now();
      pSheet.appendRow([pendingId, new Date().toISOString(), JSON.stringify(data)]);

      // Create Razorpay order
      const orderPayload = {
        amount: Math.round(donationAmount * 100),
        currency: 'INR',
        receipt: pendingId,
        payment_capture: 1
      };

      const url = 'https://api.razorpay.com/v1/orders';
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(orderPayload),
        headers: {
          Authorization: 'Basic ' + Utilities.base64Encode(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET)
        },
        muteHttpExceptions: true
      };

      const resp = UrlFetchApp.fetch(url, options);
      const respText = resp.getContentText();
      const respJson = JSON.parse(respText || '{}');

      // Return HTML that launches Razorpay checkout (will post back to this webapp with action=verify)
      const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body>
      <p>Redirecting to payment...</p>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <script>
        (function(){
          var options = {
            "key": "${RAZORPAY_KEY_ID}",
            "amount": ${respJson.amount || orderPayload.amount},
            "order_id": "${respJson.id || ''}",
            "name": "Shree Jugal Kishore Ji Temple",
            "description": "Aarti Booking Donation",
            "handler": function(response){
              var body = new URLSearchParams();
              body.append('action','verify');
              body.append('payment_id', response.razorpay_payment_id);
              body.append('order_id', response.razorpay_order_id);
              body.append('signature', response.razorpay_signature);
              body.append('pendingId','${pendingId}');
              fetch(window.location.href, {method: 'POST', body: body}).then(function(r){ return r.text(); }).then(function(t){ document.body.innerHTML = t; try{ window.top.location.reload(); } catch(e){} });
            },
            "modal": { "ondismiss": function(){ document.body.innerHTML = '<p>Payment cancelled.</p>'; try{ window.top.location.reload(); } catch(e){} } }
          };
          var rzp = new Razorpay(options);
          rzp.open();
        })();
      </script>
      </body></html>`;

      return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // No donation — append directly to booking sheet (preserve existing behavior)
    const headerRange = bookingSheet.getRange(1, 1, 1, bookingSheet.getLastColumn());
    const headers = headerRange.getValues()[0].map(function(h){ return String(h).trim(); });
    if (headers.indexOf('Timestamp') !== -1 && !data['Timestamp']) data['Timestamp'] = new Date().toISOString();

    const row = headers.map(function(h) {
      var v = data[h] || data[h.toLowerCase()] || '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    });

    bookingSheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({status: 'ok', message: 'Booking saved'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('doPost error:', err.message, err.stack);
    return ContentService
      .createTextOutput(JSON.stringify({status: 'error', message: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function hmacSha256Hex(data, key) {
  const raw = Utilities.computeHmacSha256Signature(data, key);
  return raw.map(function(byte){
    var v = byte;
    if (v < 0) v += 256;
    var hex = v.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

