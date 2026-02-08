/**
 * CREATE_ORDER Script for Razorpay Integration
 * 
 * This script:
 * 1. Receives form submission with action=CREATE_ORDER
 * 2. Creates a Razorpay payment order
 * 3. Returns HTML page with embedded Razorpay checkout
 * 4. On payment success, handler submits to SAVE_BOOKING script
 * 
 * Deploy as a new Web App:
 * - Execute as: Your account
 * - Who has access: Anyone (including anonymous)
 * 
 * Set these Script Properties:
 * - RAZORPAY_KEY_ID: your_key_id
 * - RAZORPAY_KEY_SECRET: your_key_secret
 */

function parseRequest(e) {
  let params = {};
  const contentType = e.postData.type;
  
  // Check content type first
  if (contentType === 'application/x-www-form-urlencoded') {
    // Parse form-urlencoded data
    const decoded = decodeURIComponent(e.postData.contents);
    const pairs = decoded.split('&');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
  } else {
    // Try JSON as fallback
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      // Unable to parse
      console.log('Could not parse request:', err.toString());
    }
  }
  
  return params;
}

function doPost(e) {
  const params = parseRequest(e);
  const action = params.action || '';

  if (action === 'CREATE_ORDER') {
    return createOrderAndCheckout(params);
  }

  return HtmlService.createHtmlOutput('<h3>Error</h3><p>Unknown action</p>');
}

function createOrderAndCheckout(params) {
  try {
    const RAZORPAY_KEY_ID = PropertiesService.getScriptProperties().getProperty('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = PropertiesService.getScriptProperties().getProperty('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return HtmlService.createHtmlOutput('<h3>Error</h3><p>Razorpay credentials not configured</p>');
    }

    const donationAmount = parseFloat(params.donationAmount || '0');
    if (donationAmount <= 0) {
      return HtmlService.createHtmlOutput('<h3>Error</h3><p>Invalid donation amount</p>');
    }

    // Create Razorpay order
    const amount = Math.round(donationAmount * 100); // Convert to paise
    const orderPayload = {
      amount: amount,
      currency: 'INR',
      receipt: 'booking_' + Date.now()
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET),
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(orderPayload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.razorpay.com/v1/orders', options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200) {
      return HtmlService.createHtmlOutput('<h3>Error</h3><p>Failed to create payment order</p>');
    }

    const orderId = result.id;
    const saveBookingScript = params.saveBookingScript || 'https://script.google.com/macros/s/AKfycbw0JH3c4YzgryjjNZI6QmK8Rh-Dk9LBfGK6wOUrIA_kVq5vAYq9OZ499C4G3t9vd9pixQ/exec';

    // Build hidden form with all booking data
    const bookingDataHtml = Object.keys(params)
      .filter(k => k !== 'action' && k !== 'donationAmount' && k !== 'saveBookingScript')
      .map(k => `<input type="hidden" name="${k}" value="${String(params[k]).replace(/"/g, '&quot;')}">`)
      .join('\n          ');

    // Return HTML page with embedded Razorpay checkout
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Payment - Shree Jugal Kishore Ji Temple</title>
        <script src="https://checkout.razorpay.com/v1/checkout.js"><\/script>
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
            margin: 10px 5px;
          }
          button:hover { background: #152d5f; }
          .status { margin: 20px 0; font-size: 16px; display: none; }
          .success { color: #28a745; }
          .error { color: #dc3545; }
          .spinner {
            display: none;
            text-align: center;
            padding: 2rem;
          }
          .spinner div {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #1e3d7b;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div id="content">
            <h2>Complete Your Payment</h2>
            <p><strong>Amount to Pay:</strong> ₹${donationAmount}</p>
            <button onclick="openCheckout()">Pay Now</button>
            <button onclick="goBack()">Cancel</button>
          </div>
          
          <div id="spinner" class="spinner">
            <div><\/div>
          </div>
          
          <div id="status" class="status"><\/div>
        </div>

        <!-- Hidden form for saving booking after payment -->
        <form id="bookingForm" method="POST" action="${saveBookingScript}" style="display:none;">
          ${bookingDataHtml}
          <input type="hidden" name="donationAmount" value="${donationAmount}">
          <input type="hidden" name="donationStatus" value="Paid">
          <input type="hidden" name="razorpay_order_id" id="razorpay_order_id" value="${orderId}">
          <input type="hidden" name="razorpay_payment_id" id="razorpay_payment_id" value="">
          <input type="hidden" name="razorpay_signature" id="razorpay_signature" value="">
        </form>

        <script>
          const RAZORPAY_KEY_ID = '${RAZORPAY_KEY_ID}';
          const ORDER_ID = '${orderId}';
          const DONATION_AMOUNT = ${amount};
          
          function openCheckout() {
            const prefillName = document.querySelector('input[name="fullName"]')?.value || '';
            const prefillEmail = document.querySelector('input[name="emailId"]')?.value || '';
            const prefillContact = document.querySelector('input[name="mobile"]')?.value || '';

            const options = {
              key: RAZORPAY_KEY_ID,
              amount: DONATION_AMOUNT,
              currency: 'INR',
              order_id: ORDER_ID,
              name: 'Shree Jugal Kishore Ji Temple',
              description: 'Aarti Booking with Donation',
              prefill: {
                name: prefillName,
                email: prefillEmail,
                contact: prefillContact
              },
              handler: function(response) {
                // Payment successful - store response and submit form
                document.getElementById('razorpay_payment_id').value = response.razorpay_payment_id;
                document.getElementById('razorpay_signature').value = response.razorpay_signature;
                
                // Show processing message
                document.getElementById('content').style.display = 'none';
                document.getElementById('spinner').style.display = 'block';
                
                // Auto-submit form to save booking
                setTimeout(function() {
                  document.getElementById('bookingForm').submit();
                }, 500);
              },
              modal: {
                ondismiss: function() {
                  document.getElementById('status').className = 'status error';
                  document.getElementById('status').style.display = 'block';
                  document.getElementById('status').textContent = 'Payment cancelled. Click "Pay Now" to try again.';
                  document.getElementById('content').style.display = 'block';
                }
              }
            };

            const rzp = new Razorpay(options);
            rzp.open();
          }

          function goBack() {
            history.back();
          }
        <\/script>
      </body>
      </html>
    `;

    return HtmlService.createHtmlOutput(html);

  } catch (err) {
    return HtmlService.createHtmlOutput('<h3>Error</h3><p>' + err.toString() + '</p>');
  }
}
