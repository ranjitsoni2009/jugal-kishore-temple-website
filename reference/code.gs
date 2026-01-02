const SHEET_ID = '1aW9WeovCz7602-125YskFPIQqvf3FgSxCarlX80WyzQ';
const SHEET_NAME = 'Booking'; // change if needed

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
  
  // Find the aartiDate column
  const dateColumnIndex = headers.findIndex(h => h.toLowerCase() === 'aartidate');
  
  if (dateColumnIndex !== -1) {
    data = data.filter(row => {
      const aartiDateValue = row['aartiDate'] || row['Aarti Date'];
      if (!aartiDateValue) return false;
      
      const aartiDate = new Date(aartiDateValue);
      aartiDate.setHours(0, 0, 0, 0);
      
      // Keep records where aartiDate is between today and 30 days from now
      return aartiDate >= today && aartiDate <= thirtyDaysLater;
    });
  }
  
  console.log('Filtered data (next 30 days):', data);

  return ContentService.createTextOutput(JSON.stringify(data))
         .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // Log incoming request for debugging
    console.log('doPost called with parameters:', e.parameter);
    
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Sheet not found: ' + SHEET_NAME);

    // Read header row (row 1)
    var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    var headers = headerRange.getValues()[0].map(function(h){ return String(h).trim(); });
    console.log('Sheet headers:', headers);

    // Get form data from e.parameter (form-encoded POST data)
    var data = {};
    for (var key in e.parameter) {
      if (e.parameter.hasOwnProperty(key)) {
        var val = e.parameter[key];
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
    var row = headers.map(function(h) {
      var v = data[h] || '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    });

    console.log('Row to append:', row);

    // Append the row to the sheet
    sheet.appendRow(row);
    console.log('Row appended successfully');

    // Return success response
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

