# 🔐 Payment System Test Credentials

Complete guide for testing all payment methods in the StayHaven hotel booking system.

---

## 🎯 Quick Start

1. Navigate to any hotel detail page
2. Select check-in and check-out dates
3. Click "Book Now"
4. Fill in guest information
5. Select a payment method and use the test credentials below

---

## 💳 Payment Methods & Test Credentials

### 1. eSewa (Popular in Nepal)

**Test Environment:** https://rc-epay.esewa.com.np

**Test Credentials:**
```
eSewa ID: 9806800001, 9806800002, 9806800003, 9806800004, 9806800005
Password: Nepal@123
MPIN: 1234
OTP: 123456 (6-digit verification code)
```

**How to Test:**
1. Select "eSewa" as payment method
2. Click "Pay via eSewa"
3. You'll be redirected to eSewa's test payment page
4. Login with any of the test eSewa IDs above
5. Enter MPIN: 1234
6. Confirm payment
7. You'll be redirected back to the booking confirmation page

**Test Transaction Flow:**
- Amount: Automatically calculated based on booking
- Currency: NPR (Nepalese Rupees)
- Success Rate: 100% in test mode
- Redirect Time: ~2-3 seconds

**Important Notes:**
- eSewa test accounts have unlimited balance
- All test transactions are simulated (no real money)
- Test mode uses `rc-epay.esewa.com.np` domain
- Production uses `epay.esewa.com.np`

---

### 2. Khalti (Digital Wallet)

**Test Environment:** https://test-pay.khalti.com

**Test Credentials:**
```
Mobile Number: 9800000001, 9800000002, 9800000003, 9800000004, 9800000005
MPIN: 1111
OTP: 987654
```

**How to Test:**
1. Select "Khalti" as payment method
2. Click "Pay via Khalti"
3. You'll be redirected to Khalti's test payment page
4. Enter test mobile number (e.g., 9800000001)
5. Enter MPIN: 1111
6. Enter OTP: 987654
7. Confirm payment
8. You'll be redirected back to the booking confirmation page

**Test Transaction Flow:**
- Amount: Automatically calculated based on booking
- Currency: NPR (Nepalese Rupees)
- Success Rate: 100% in test mode
- Redirect Time: ~2-3 seconds

**Important Notes:**
- Khalti test accounts have unlimited balance
- All test transactions are simulated
- Test mode uses `test-pay.khalti.com` domain
- Production uses `khalti.com`
- If MPIN gets locked, use a different test number

**Getting Your Own Test Keys:**
1. Visit: https://test-admin.khalti.com
2. Sign up for a merchant account
3. Complete verification
4. Get your test API keys from Settings → API Keys
5. Update `KHALTI_SECRET_KEY` in `backend/.env`

---

### 3. Credit/Debit Card (Stripe)

**Test Environment:** Stripe Test Mode

**Test Card Numbers:**

| Card Number | Brand | Result | CVC | Expiry |
|-------------|-------|--------|-----|--------|
| 4242 4242 4242 4242 | Visa | Success | Any 3 digits | Any future date |
| 4000 0025 0000 3155 | Visa (3DS) | Success with 3DS | Any 3 digits | Any future date |
| 5555 5555 5555 4444 | Mastercard | Success | Any 3 digits | Any future date |
| 3782 822463 10005 | Amex | Success | Any 4 digits | Any future date |
| 4000 0000 0000 9995 | Visa | Declined | Any 3 digits | Any future date |
| 4000 0000 0000 0002 | Visa | Declined (card declined) | Any 3 digits | Any future date |

**How to Test:**
1. Select "Credit/Debit Card" as payment method
2. Enter any test card number from above
3. Enter cardholder name: Any name (e.g., "JOHN DOE")
4. Enter expiry: Any future date (e.g., "12/28")
5. Enter CVV: Any 3 digits (e.g., "123")
6. Click "Pay"
7. Payment will be processed instantly

**Test Transaction Flow:**
- Amount: Automatically calculated based on booking
- Currency: NPR (Nepalese Rupees)
- Processing Time: Instant
- Success Rate: Depends on card number used

**Important Notes:**
- All test cards have unlimited balance
- No real money is charged in test mode
- Use any future expiry date (MM/YY format)
- Use any 3-digit CVV (4 digits for Amex)
- Cardholder name can be anything

**Common Test Scenarios:**
```
✅ Successful Payment:
Card: 4242 4242 4242 4242
Name: JOHN DOE
Expiry: 12/28
CVV: 123

❌ Declined Payment:
Card: 4000 0000 0000 0002
Name: JOHN DOE
Expiry: 12/28
CVV: 123

🔒 3D Secure Required:
Card: 4000 0025 0000 3155
Name: JOHN DOE
Expiry: 12/28
CVV: 123
```

---

### 4. Bank Transfer (Manual Verification)

**Test Bank Account Details:**

**Transfer TO (StayHaven Account):**
```
Account Name: StayHaven Hotels Pvt. Ltd.
Bank: Nabil Bank Limited
Account Number: 0123456789012345
Amount: [Automatically shown based on booking]
```

**Your Test Details (Transfer FROM):**
```
Your Account Name: Test User
Your Account Number: 9876543210
Your Bank Name: Any Bank (e.g., NIC Asia Bank, Himalayan Bank)
Transaction ID: TXN[any 9 digits] (e.g., TXN123456789)
```

**How to Test:**
1. Select "Bank Transfer" as payment method
2. Note the StayHaven bank account details shown
3. Fill in your test bank details:
   - Your Account Name: Test User
   - Your Account Number: 9876543210
   - Your Bank Name: NIC Asia Bank
   - Transaction ID: TXN123456789
4. Click "Pay"
5. Booking will be created with "Pending" payment status
6. You'll receive confirmation that payment is under verification

**Test Transaction Flow:**
- Amount: Automatically calculated based on booking
- Currency: NPR (Nepalese Rupees)
- Verification Time: Manual (24 hours in production)
- Status: Pending until verified by admin

**Important Notes:**
- Bank transfer requires manual verification
- Booking is created but marked as "Pending Payment"
- In test mode, you can use any transaction ID
- In production, use actual bank transfer receipt details
- Admin must verify payment in the backend dashboard

---

## 🧪 Testing Checklist

### Before Testing
- [ ] Backend server is running (`npm run dev` in backend folder)
- [ ] Frontend server is running (`npm run dev` in frontend folder)
- [ ] MongoDB is connected
- [ ] Environment variables are configured

### Test Each Payment Method
- [ ] eSewa - Successful payment
- [ ] eSewa - User cancels payment
- [ ] Khalti - Successful payment
- [ ] Khalti - User cancels payment
- [ ] Card - Successful payment (4242 4242 4242 4242)
- [ ] Card - Declined payment (4000 0000 0000 0002)
- [ ] Bank Transfer - Submit details
- [ ] Bank Transfer - Verify pending status

### Test Edge Cases
- [ ] Invalid card number
- [ ] Expired card
- [ ] Invalid CVV
- [ ] Missing guest information
- [ ] Invalid date range
- [ ] Room already booked for selected dates

### Test UI/UX
- [ ] Payment modal opens correctly
- [ ] All payment methods are visible
- [ ] Form validation works
- [ ] Error messages are clear
- [ ] Success redirect works
- [ ] Booking confirmation page displays correctly
- [ ] Mobile responsive design

---

## 🚀 Production Deployment

### eSewa Production Setup
1. Register at: https://esewa.com.np/merchant
2. Complete KYC verification
3. Get production credentials:
   - Merchant Code
   - Secret Key
4. Update `backend/.env`:
   ```env
   NODE_ENV=production
   ESEWA_SECRET_KEY=your_production_secret_key
   ESEWA_PRODUCT_CODE=your_merchant_code
   ```

### Khalti Production Setup
1. Register at: https://admin.khalti.com
2. Complete merchant verification
3. Get live API keys from Settings → API Keys
4. Update `backend/.env`:
   ```env
   KHALTI_SECRET_KEY=live_secret_key_YOUR_LIVE_KEY
   KHALTI_PUBLIC_KEY=live_public_key_YOUR_LIVE_KEY
   ```

### Stripe Production Setup
1. Create account at: https://stripe.com
2. Complete business verification
3. Get live API keys from Dashboard → Developers → API Keys
4. Update `backend/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
   ```

---

## 🔍 Troubleshooting

### Payment Not Processing
**Issue:** Payment button doesn't work
**Solution:**
- Check browser console for errors
- Verify backend is running
- Check network tab for API errors
- Ensure all required fields are filled

### Redirect Not Working
**Issue:** Not redirected after payment
**Solution:**
- Check `CLIENT_URL` in backend `.env`
- Verify return URLs in payment gateway settings
- Check browser popup blockers
- Clear browser cache

### Card Payment Fails
**Issue:** Card payment always fails
**Solution:**
- Use test card numbers from this document
- Check Stripe API keys in `.env`
- Verify Stripe account is in test mode
- Check backend logs for detailed errors

### Khalti/eSewa Redirect Fails
**Issue:** Redirect to payment gateway fails
**Solution:**
- Verify API keys are correct
- Check if using test keys with test URLs
- Ensure return URL is whitelisted
- Check backend logs for API errors

### Bank Transfer Not Saving
**Issue:** Bank transfer details not saved
**Solution:**
- Check all required fields are filled
- Verify transaction ID format
- Check backend database connection
- Review backend logs for errors

---

## 📞 Support

### Payment Gateway Support

**eSewa:**
- Email: support@esewa.com.np
- Phone: +977-01-5970054
- Docs: https://developer.esewa.com.np

**Khalti:**
- Email: support@khalti.com
- Phone: +977-01-5970053
- Docs: https://docs.khalti.com

**Stripe:**
- Email: support@stripe.com
- Docs: https://stripe.com/docs
- Dashboard: https://dashboard.stripe.com

### StayHaven Support
- Email: support@stayhaven.com
- GitHub Issues: [Your Repository URL]

---

## 📊 Payment Flow Diagram

```
User Selects Hotel & Dates
         ↓
   Clicks "Book Now"
         ↓
  Enters Guest Info
         ↓
 Selects Payment Method
         ↓
    ┌────┴────┬────────┬────────┐
    ↓         ↓        ↓        ↓
  eSewa    Khalti    Card     Bank
    ↓         ↓        ↓        ↓
Redirect  Redirect  Process  Submit
    ↓         ↓        ↓        ↓
  Pay       Pay     Instant  Pending
    ↓         ↓        ↓        ↓
Return    Return   Success  Verify
    ↓         ↓        ↓        ↓
    └────┬────┴────────┴────────┘
         ↓
  Booking Confirmed
         ↓
 Confirmation Email
         ↓
   View Bookings
```

---

## ✅ Success Criteria

Your payment system is working correctly when:

1. ✅ All 4 payment methods are selectable
2. ✅ eSewa redirects to test payment page
3. ✅ Khalti redirects to test payment page
4. ✅ Card payments process instantly
5. ✅ Bank transfer details are saved
6. ✅ Successful payments redirect to confirmation page
7. ✅ Booking details are saved in database
8. ✅ Payment transactions are recorded
9. ✅ Error messages are clear and helpful
10. ✅ Mobile responsive on all screens

---

**Last Updated:** April 30, 2026  
**Version:** 1.0.0  
**Status:** ✅ Ready for Testing

---

## 🎉 Happy Testing!

If you encounter any issues not covered in this guide, please check the backend logs or contact support.
