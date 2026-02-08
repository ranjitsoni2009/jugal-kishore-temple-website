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
 * doPost receives form submission from CREATE_ORDER after payment
 * All payment data is pre-filled in the hidden form by CREATE_ORDER
 * This script just needs to save everything to the Google Sheet
 */
function doPost(e) {
  try {
    console.log('SAVE_BOOKING doPost called');
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME);

    // Read header row (row 1)
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const headers = headerRange.getValues()[0].map(h => String(h).trim());
    console.log('Sheet headers:', headers);

    // Get form data from e.parameter (form-encoded POST data)
    const data = {};
    for (const key in e.parameter) {
      if (e.parameter.hasOwnProperty(key)) {
        let val = e.parameter[key];
        // Handle array values
        if (Array.isArray(val)) val = val[0];
        data[key] = val;
      }
    }
    console.log('Received data:', data);

    // Add timestamp if the sheet has a Timestamp column
    if (headers.indexOf('Timestamp') !== -1 && !data['Timestamp']) {
      data['Timestamp'] = new Date().toISOString();
    }

    // Build row in the same order as headers
    const row = headers.map(h => {
      const v = data[h] || '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    });

    console.log('Row to append:', row);

    // Append the row to the sheet
    sheet.appendRow(row);
    console.log('Row appended successfully');

    // Return success HTML page
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed - Shree Jugal Kishore Ji Temple</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
          }
          .success {
            color: #28a745;
            font-size: 24px;
            margin-bottom: 1rem;
          }
          h2 { color: #1e3d7b; margin-top: 0; }
          p { color: #666; }
          button {
            background: #1e3d7b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 1rem;
          }
          button:hover { background: #152d5f; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h2>Booking Confirmed!</h2>
          <p>Your Aarti booking has been successfully confirmed. Payment received.</p>
          <p>We look forward to seeing you at the temple.</p>
          <button onclick="window.location.href='/'">Back to Home</button>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error('doPost error:', err.message, err.stack);
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Error - Shree Jugal Kishore Ji Temple</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
          }
          .error { color: #dc3545; font-size: 24px; }
          h2 { color: #1e3d7b; margin-top: 0; }
          p { color: #666; }
          button {
            background: #1e3d7b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 1rem;
          }
          button:hover { background: #152d5f; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">✗</div>
          <h2>Error</h2>
          <p>` + err.message + `</p>
          <button onclick="window.location.href='/'">Back to Home</button>
        </div>
      </body>
      </html>
    `);
  }
}

