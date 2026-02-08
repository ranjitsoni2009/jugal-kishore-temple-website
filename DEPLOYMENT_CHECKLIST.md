# Quick Deployment Checklist

## Step 1: Create & Deploy CREATE_ORDER Script

- [ ] Go to https://script.google.com → Create new project
- [ ] Copy code from `reference/code_updated.gs` into editor
- [ ] Save the project
- [ ] Go to `Project Settings` → add Script Properties:
  - [ ] `RAZORPAY_KEY_ID` = your key ID
  - [ ] `RAZORPAY_KEY_SECRET` = your key secret
- [ ] Click `Deploy` → New deployment → Web app
- [ ] Set "Execute as" = `Your account`
- [ ] Set "Who has access" = `Anyone (including anonymous)`
- [ ] Click Deploy and copy the URL

## Step 2: Update index.html

- [ ] Find line ~832: `const CREATE_ORDER_SCRIPT = '...'`
- [ ] Replace with your new CREATE_ORDER deployment URL
- [ ] Find line ~857: `const RAZORPAY_KEY_ID = 'rzp_test_...'`
- [ ] Replace with your actual Razorpay key ID

## Step 3: Verify Google Sheet

- [ ] Check that your booking sheet has these columns:
  - [ ] fullName
  - [ ] emailId
  - [ ] mobile
  - [ ] aartiDate
  - [ ] slot
  - [ ] message
  - [ ] donationAmount (NEW)
  - [ ] donationStatus (NEW)
  - [ ] razorpay_payment_id (NEW)
  - [ ] razorpay_order_id (NEW)
  - [ ] razorpay_signature (NEW)
  - [ ] agreement

## Step 4: Test

### Test 1: No Donation (Direct Save)
- [ ] Fill form with `Donation Amount = 0` (or leave blank)
- [ ] Click "Submit Booking"
- [ ] Should show success
- [ ] Check sheet: `donationStatus = "Not Paid"`

### Test 2: With Donation (Payment Flow)
- [ ] Fill form with `Donation Amount = 100+`
- [ ] Click "Submit Booking"
- [ ] Browser redirects to CREATE_ORDER script
- [ ] Razorpay checkout auto-opens
- [ ] Use test card: `4111 1111 1111 1111`, any future expiry, any CVV
- [ ] Click "Pay Now"
- [ ] After payment, browser auto-submits to SAVE_BOOKING
- [ ] Should show success
- [ ] Check sheet: `donationStatus = "Paid"`, payment fields populated

## Troubleshooting

**Issue:** Order creation fails with "credentials not set"
→ Solution: Check Script Properties in CREATE_ORDER script; ensure both keys are saved

**Issue:** Razorpay checkout doesn't open
→ Solution: Check browser console; check CREATE_ORDER script logs; verify order ID was created

**Issue:** Payment succeeds but booking doesn't save
→ Solution: Check that sheet has all required columns; verify form auto-submits after payment in browser DevTools

**Issue:** Form submission shows cross-domain error
→ Solution: This approach uses form submission (no fetch), which bypasses CORS; if issue persists, check browser console logs

---

**Done?** Your payment integration is live! 🎉
