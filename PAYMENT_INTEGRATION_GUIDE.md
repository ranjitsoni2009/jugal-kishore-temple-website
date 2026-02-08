# Razorpay Payment Integration - New Approach

## Overview

This is a **4-step payment flow** with form submission (avoids CORS):

```
1. User fills form + clicks "Submit Booking"
   ↓
2. Form submits to CREATE_ORDER script (POST, target="_self")
   ↓
3. CREATE_ORDER creates Razorpay order and returns HTML page
   ↓
4. HTML page auto-opens Razorpay checkout
   ↓
5. After payment succeeds, form auto-submits to SAVE_BOOKING script
   ↓
6. Booking + payment data saved to sheet
```

## What Changed

### Frontend (index.html)

**Changes in the booking form submission handler (lines ~850-900):**

- **Before:** Tried to use `fetch()` to create order (CORS issue)
- **Now:** Form submission to CREATE_ORDER with `action=CREATE_ORDER`
- **Form submits directly** to CREATE_ORDER script with `target="_self"` (no CORS issues)
- **CREATE_ORDER returns HTML** page with:
  - Embedded Razorpay checkout JavaScript
  - Hidden form with all booking data + payment fields
  - Auto-open checkout on page load
  - On payment success: auto-submit form to SAVE_BOOKING script

### Backend (CREATE_ORDER Script)

**File:** `reference/code_updated.gs`

- **Purpose:** Receives form POST, creates Razorpay order, returns HTML with embedded checkout
- **Input:** Form POST with `action=CREATE_ORDER` + all booking fields + `donationAmount`
- **Processing:**
  1. Parses form data
  2. Creates Razorpay order via API
  3. Generates HTML page with:
     - Razorpay checkout embedded
     - Hidden form with booking + payment fields
     - JavaScript to auto-open checkout
- **On Payment Success:** Auto-submits hidden form to SAVE_BOOKING script with payment data
- **Output:** HTML page with checkout (not JSON)

## Deployment Steps

### 1. Deploy CREATE_ORDER Script

1. **Create new Google Apps Script** (or use a standalone file):
   - Go to https://script.google.com
   - Create new project
   - Copy code from `reference/code_updated.gs` into the script editor
   - Save the project

2. **Set Script Properties:**
   - In editor, go to `Project Settings` (gear icon)
   - Scroll to "Script Properties"
   - Add these properties:
     - **Key:** `RAZORPAY_KEY_ID` → **Value:** your Razorpay test/live key ID
     - **Key:** `RAZORPAY_KEY_SECRET` → **Value:** your Razorpay test/live key secret
   - Click "Save"

3. **Deploy as Web App:**
   - Click `Deploy` → `New deployment`
   - Select type: `Web app`
   - Execute as: `Your account`
   - Who has access: `Anyone (including anonymous)`
   - Click `Deploy`
   - Copy the deployment URL (looks like: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`)

4. **Update index.html:**
   - Find line ~833: `const CREATE_ORDER_SCRIPT = '...'`
   - Replace the URL with your new deployment URL

### 2. Verify Existing SAVE_BOOKING Script

The existing `APP_SCRIPT` must accept these new fields:

- `razorpay_payment_id` (string)
- `razorpay_order_id` (string)
- `razorpay_signature` (string)
- `donationStatus` (string: "Paid" or "Not Paid")
- `donationAmount` (number, optional)

If your sheet doesn't have these columns, add them before testing.

### 3. Update Razorpay Key in Frontend

- In `index.html`, line ~858: `const RAZORPAY_KEY_ID = 'rzp_test_...'`
- Replace with your actual Razorpay key ID (test or live)

## Testing

### Test No-Donation Booking (Direct Submit)

1. Open the site
2. Go to "Thaal Booking"
3. Fill form with `Donation Amount = 0`
4. Click "Submit Booking"
5. Should directly save to sheet and show success
6. Check sheet: row should have `donationStatus = "Not Paid"`, `donationAmount = 0`

### Test Donation Booking (With Payment)

1. Go to "Thaal Booking"
2. Fill form with `Donation Amount = 100` (or any amount)
3. Click "Submit Booking"
4. Browser logs should show: "Creating payment order..."
5. Razorpay checkout opens
6. Use test card: `4111 1111 1111 1111`, any future expiry, any CVV
7. Click "Pay Now"
8. Should see: "✓ Payment successful! Click 'Confirm Booking' to save."
9. Click "Confirm Booking" button
10. Form submits to `APP_SCRIPT`
11. Should show success modal
12. Check sheet: row should have payment fields + `donationStatus = "Paid"` + donation amount

## Debugging

### If Order Creation Fails

1. Open browser DevTools → Network tab
2. Look for fetch request to `CREATE_ORDER_SCRIPT`
3. Check response: Is it returning `{success: false, message: "..."}` ?
4. Common issues:
   - Razorpay credentials not set in Script Properties
   - Invalid donation amount (must be > 0)
   - Script properties not saved

### If Razorpay Checkout Doesn't Open

1. Check browser console for errors
2. Verify `RAZORPAY_KEY_ID` is correct in `index.html`
3. Check that `orderId` was received from CREATE_ORDER script

### If Payment Succeeds but Form Doesn't Submit

1. Check browser console for JavaScript errors
2. Verify `APP_SCRIPT` URL is correct
3. Check that sheet has columns for payment fields

## Architecture Advantages of This Approach

✅ **Simpler CREATE_ORDER Script** — only creates orders, returns JSON
✅ **Client-side Payment Verification** — Razorpay SDK handles it
✅ **User Control** — explicit "Confirm Booking" step
✅ **No Cross-Domain Redirects** — avoids Google iframe security issues
✅ **Easier Debugging** — separate order creation and booking save steps
✅ **Backward Compatible** — existing SAVE_BOOKING script unchanged

## Files Modified

- `index.html` — Form submission handler for payment flow (lines ~850-930)
- `reference/code_updated.gs` — NEW: Create-order-only backend script

## Files NOT Modified

- `js/main.js` — calendar helper
- `css/style.css` — layout
- Existing SAVE_BOOKING script (APP_SCRIPT) — no changes needed
