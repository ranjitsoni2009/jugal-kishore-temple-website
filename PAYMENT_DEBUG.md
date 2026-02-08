# Payment Flow Debugging Guide

## Issue: Google Apps Script COMPLETED but order ID not showing in UI

### Steps to debug:

1. **Open Browser DevTools** (F12 → Console tab)
2. **Trigger a booking with donation amount > 0**
3. **Look for these console logs:**
   - `"Message handler attached, waiting for postMessage from CREATE_ORDER script..."`
   - `"Submitting form to CREATE_ORDER script: [URL]"`
   - `"postMessage received: { origin: ..., data: ... }"`
   - `"Opening Razorpay with order ID: order_xxx"`

### If you DON'T see "postMessage received":

**The CREATE_ORDER script is completing but the message isn't reaching the page.**

**Fix: Update origin check in index.html**

The origin filter might be too strict. Replace this line in index.html (around line 858):

```javascript
if (event.origin.indexOf('script.google.com') === -1 && event.origin !== 'null') return;
```

With this more permissive version:

```javascript
// Accept messages from Google Apps Script or local development (null origin for file://)
console.log('Message origin:', event.origin);
// Only filter if origin is clearly from a different domain
if (event.origin && event.origin !== 'null' && event.origin.indexOf('script.google.com') === -1 && !event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) {
  console.log('Filtered message from origin:', event.origin);
  return;
}
```

### If you see "postMessage received" BUT wrong data:

**The Apps Script returned data in the wrong format.**

Check:
- Does the CREATE_ORDER Apps Script have this code?
  ```javascript
  window.parent.postMessage({type:'ORDER_CREATED', orderId: respJson.id}, '*');
  ```

- Is `respJson.id` actually set? Log it in your Apps Script:
  ```javascript
  Logger.log('Order response:', respJson);
  Logger.log('Order ID:', respJson.id);
  ```

### If you see "Order creation timed out":

**The postMessage never arrived within 30 seconds.**

- Check if CREATE_ORDER script is deployed as **Web App** (not just a script)
- Check deployment access level is **"Anyone, even anonymous"**
- Check `CREATE_ORDER_SCRIPT` URL in index.html is correct
- Check Apps Script logs for errors

### Full debug: Add these logs to index.html

Find this section (around line 856-890) and add console.log calls:

```javascript
const messageHandler = function(event) {
  console.log('postMessage received:', { origin: event.origin, data: event.data });
  
  if (event.origin && event.origin !== 'null' && event.origin.indexOf('script.google.com') === -1) {
    console.log('Origin filtered, returning early:', event.origin);
    return;
  }

  const data = event.data;
  if (data && data.type === 'ORDER_CREATED' && data.orderId) {
    console.log('ORDER_CREATED received with ID:', data.orderId);
    // ... rest of handler
  } else if (data && data.type === 'ORDER_ERROR') {
    console.log('ORDER_ERROR received:', data.error);
    // ... rest of handler
  } else {
    console.log('Unknown message data:', data);
  }
};
window.addEventListener('message', messageHandler);
console.log('Message handler attached');
```

### Most common issues:

1. **Origin check is too strict** → The postMessage arrives but gets filtered
2. **CREATE_ORDER script URL is wrong** → Form submits to wrong endpoint
3. **CREATE_ORDER script not returning postMessage HTML** → Apps Script doesn't call `window.parent.postMessage()`
4. **Razorpay checkout opens but nothing happens** → `openRazorpayCheckout()` function may have issues

Let us know what console logs you see!
