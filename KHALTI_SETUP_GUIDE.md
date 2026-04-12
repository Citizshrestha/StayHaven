# 🔧 Khalti Payment Integration - Setup Guide

## ⚠️ Current Issue

You're getting a **400 Bad Request** error from Khalti API because:

1. **Wrong API Key Type**: You're using a `live_secret_key_...` in development
2. **Missing Test Credentials**: You need proper Khalti test/sandbox credentials
3. **API Mismatch**: Live keys don't work with test environment URLs

---

## ✅ Solution: Get Khalti Test Credentials

### Step 1: Register for Khalti Merchant Account

1. **Visit Khalti Merchant Portal:**
   - Test/Sandbox: https://test-admin.khalti.com
   - Production: https://admin.khalti.com

2. **Create Account:**
   - Sign up with your email
   - Complete merchant verification
   - Wait for approval (usually 1-2 business days)

3. **Get API Keys:**
   - Login to merchant dashboard
   - Navigate to **Settings** → **API Keys**
   - Copy your **Test Secret Key** and **Test Public Key**

---

### Step 2: Update Backend Environment Variables

Update your `Backend/.env` file:

```env
# Khalti Payment Gateway (Test/Sandbox)
# Get from: https://test-admin.khalti.com → Settings → API Keys
KHALTI_SECRET_KEY=test_secret_key_YOUR_ACTUAL_TEST_KEY_HERE
KHALTI_PUBLIC_KEY=test_public_key_YOUR_ACTUAL_PUBLIC_KEY_HERE
```

**Important:**
- Test keys start with `test_secret_key_` or `test_public_key_`
- Live keys start with `live_secret_key_` or `live_public_key_`
- NEVER use live keys in development!

---

### Step 3: Restart Backend Server

After updating `.env`:

```bash
cd Backend
npm run dev
```

The system will now automatically:
- Detect if you're using test or live keys
- Use the correct API URL (`https://a.khalti.com` for test, `https://khalti.com` for live)
- Log detailed error messages if something goes wrong

---

## 🧪 Testing Khalti Payments

### Test Credentials (After Getting Your Keys)

**Khalti Test Wallet:**
```
Mobile Number: 9800000001
MPIN: 1111
OTP: 987654
```

**Alternative Test Numbers:**
```
9800000002 - MPIN: 1111, OTP: 987654
9800000003 - MPIN: 1111, OTP: 987654
9800000004 - MPIN: 1111, OTP: 987654
9800000005 - MPIN: 1111, OTP: 987654
```

### Test Payment Flow

1. **Login as Guest:**
   - Email: `guest@test.com`
   - Password: `Guest@123`

2. **Go to Billing:**
   - Navigate to `/guest-dashboard/billing`

3. **Click "Pay Now":**
   - Select **Khalti** payment method
   - Click "Pay via Khalti"

4. **Khalti Payment Page:**
   - Enter test mobile number: `9800000001`
   - Enter MPIN: `1111`
   - Enter OTP: `987654`
   - Confirm payment

5. **Verify Success:**
   - You'll be redirected back to your app
   - Invoice status should update to "paid"
   - Check backend logs for payment confirmation

---

## 🔍 Troubleshooting

### Error: "Khalti secret key is not configured"

**Solution:** Add `KHALTI_SECRET_KEY` to `Backend/.env`

### Error: "400 Bad Request" from Khalti API

**Possible Causes:**
1. Using live key with test environment
2. Invalid API key format
3. Missing required fields (customer email, phone)
4. Amount is 0 or negative

**Solution:**
- Check backend console logs for detailed error
- Verify you're using test keys (start with `test_`)
- Ensure customer info is provided

### Error: "MPIN has been locked"

**Solution:** 
- Use a different test mobile number (9800000002, 9800000003, etc.)
- Or reset MPIN in Khalti test app

### Payment Stuck on "Redirecting..."

**Solution:**
- Check browser console for errors
- Verify `CLIENT_URL` in Backend/.env matches your frontend URL
- Check if popup blockers are enabled

---

## 📋 Checklist

Before testing Khalti payments:

- [ ] Registered for Khalti merchant account
- [ ] Got test API keys from merchant dashboard
- [ ] Updated `KHALTI_SECRET_KEY` in `Backend/.env`
- [ ] Keys start with `test_secret_key_` (not `live_`)
- [ ] Restarted backend server
- [ ] Test wallet has sufficient balance
- [ ] Using test mobile number (9800000001)
- [ ] Browser allows popups/redirects

---

## 🚀 Going to Production

When ready for production:

1. **Get Live API Keys:**
   - Login to https://admin.khalti.com
   - Complete KYC verification
   - Get live API keys

2. **Update Environment:**
   ```env
   NODE_ENV=production
   KHALTI_SECRET_KEY=live_secret_key_YOUR_LIVE_KEY
   KHALTI_PUBLIC_KEY=live_public_key_YOUR_LIVE_KEY
   ```

3. **Test with Real Money:**
   - Use your actual Khalti account
   - Test with small amounts first
   - Verify webhooks are working

4. **Monitor Transactions:**
   - Check Khalti merchant dashboard
   - Monitor backend logs
   - Set up Sentry alerts

---

## 📞 Support

**Khalti Support:**
- Email: support@khalti.com
- Phone: +977-01-5970053
- Docs: https://docs.khalti.com

**Common Issues:**
- Merchant verification pending → Wait 1-2 days
- API keys not working → Regenerate keys in dashboard
- Test wallet empty → Contact Khalti support

---

## 🔐 Security Notes

1. **Never commit API keys to Git**
2. **Use test keys in development**
3. **Rotate keys periodically**
4. **Monitor for suspicious transactions**
5. **Implement rate limiting**
6. **Log all payment attempts**

---

## ✨ What's Fixed

The code now:
- ✅ Auto-detects test vs live keys
- ✅ Uses correct API URL based on key type
- ✅ Provides detailed error logging
- ✅ Handles missing customer info gracefully
- ✅ Validates amount before sending to Khalti
- ✅ Proper return URL for redirects

---

## 🎯 Next Steps

1. **Get Khalti test credentials** from https://test-admin.khalti.com
2. **Update Backend/.env** with your test keys
3. **Restart backend server**
4. **Test payment flow** with test mobile number
5. **Check backend logs** for any errors
6. **Verify payment confirmation** in database

Need help? Check the backend console logs - they now show detailed Khalti API errors!
