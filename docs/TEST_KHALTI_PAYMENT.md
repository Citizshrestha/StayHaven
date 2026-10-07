# 🧪 Quick Test Guide - Khalti Payment

## ✅ What Was Fixed

The "Invalid token" error has been fixed. Khalti now works in development mode without requiring real API keys.

## 🚀 Quick Test (5 minutes)

### Step 1: Start Servers

**Terminal 1 - Backend:**
```bash
cd Backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 2: Make a Test Booking

1. Open browser: http://localhost:5173
2. Login (or create account if needed)
3. Browse hotels → Select any hotel
4. Click "Book Now"
5. Fill in:
   - Check-in date: Any future date
   - Check-out date: Day after check-in
   - Guest details: Your info
6. Click "Continue to Payment"

### Step 3: Test Khalti Payment

1. Select **"Khalti"** as payment method
2. Click **"Pay via Khalti"**
3. Watch what happens:
   - ✅ Should redirect instantly (no error)
   - ✅ Should show success page
   - ✅ Should display booking confirmation

### Step 4: Verify Success

**Check the success page shows:**
- ✅ Booking confirmation code
- ✅ Hotel details
- ✅ Check-in/check-out dates
- ✅ Payment status: Paid
- ✅ Payment method: Khalti

**Check browser console (F12):**
- ✅ No red errors
- ✅ Should see: "Khalti payment initiated"
- ✅ Should see: "Mock Khalti payment"

**Check backend console:**
- ✅ Should see: "⚠️  Khalti mock mode enabled"
- ✅ Should see: "✅ Mock Khalti payment URL generated"
- ✅ Should see: "Processing mock Khalti payment"
- ✅ Should see: "Khalti payment processed successfully"

## 🔍 Compare with eSewa

To verify Khalti works like eSewa:

### Test eSewa:
1. Make another booking
2. Select "eSewa" as payment method
3. Click "Pay via eSewa"
4. Complete payment on eSewa test page
5. Get redirected back to success page

### Test Khalti:
1. Make another booking
2. Select "Khalti" as payment method
3. Click "Pay via Khalti"
4. Get redirected instantly to success page (mock mode)

**Both should:**
- ✅ Create booking in database
- ✅ Redirect to success page
- ✅ Show confirmation details
- ✅ Mark payment as completed

## 🐛 Troubleshooting

### Issue: Still getting "Invalid token" error

**Solution:**
1. Stop backend server (Ctrl+C)
2. Verify changes were saved:
   ```bash
   cd Backend
   git status
   ```
3. Should show modified:
   - `services/paymentGatewayService.js`
   - `controllers/webhookController.js`
4. Restart backend:
   ```bash
   npm run dev
   ```

### Issue: Redirect not working

**Check:**
1. Backend console for errors
2. Frontend console (F12) for errors
3. Verify `SERVER_URL` in Backend/.env:
   ```env
   SERVER_URL=http://localhost:3000
   CLIENT_URL=http://localhost:5173
   ```

### Issue: Booking not confirmed

**Check:**
1. MongoDB is running
2. Backend console shows "Khalti payment processed successfully"
3. Database has the booking:
   ```javascript
   db.bookings.find({ paymentMethod: "khalti-mock" }).pretty()
   ```

## 📊 Expected Database Records

### After successful Khalti payment:

**Booking:**
```javascript
{
  status: "Confirmed",
  paymentStatus: "paid",
  paymentMethod: "khalti-mock",
  paymentReference: "mock_pidx_1234567890_abcd1234"
}
```

**Payment Transaction:**
```javascript
{
  method: "khalti-mock",
  type: "capture",
  status: "captured",
  amount: 896,
  currency: "NPR"
}
```

## ✅ Success Criteria

Your Khalti payment is working correctly if:

1. ✅ No "Invalid token" error
2. ✅ Booking created successfully
3. ✅ Payment marked as completed
4. ✅ Redirect to success page works
5. ✅ Booking details displayed correctly
6. ✅ Database records created
7. ✅ Backend logs show mock mode
8. ✅ No errors in console

## 🎉 Next Steps

### For Development:
- ✅ Continue using mock mode
- ✅ Test other payment methods (eSewa, Card, Bank)
- ✅ Build your features

### For Production:
1. Get real Khalti API keys from https://admin.khalti.com
2. Update Backend/.env:
   ```env
   NODE_ENV=production
   KHALTI_SECRET_KEY=live_secret_key_YOUR_KEY
   ```
3. Test with real Khalti test credentials
4. Deploy to production

## 📞 Need Help?

If you still have issues:
1. Check backend console logs
2. Check frontend console (F12)
3. Verify MongoDB is running
4. Check Backend/.env has correct URLs
5. Review KHALTI_FIX_SUMMARY.md for details

---

**Expected Test Time:** 5 minutes  
**Difficulty:** Easy  
**Status:** Ready to test ✅
