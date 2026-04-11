# Payment System Testing Guide

## Overview
This guide provides step-by-step instructions for testing the complete payment system implementation.

## Test Environment

### Test Credentials
- **Email**: `guest@test.com`
- **Password**: `Guest@123`

### URLs
- **Frontend**: https://stay-haven-eight.vercel.app
- **Backend**: https://stayhaven-backend.onrender.com
- **Guest Login**: https://stay-haven-eight.vercel.app/guest/login

## Automated Tests

### 1. Payment Logic Test
Tests validation and formatting functions without database.

```bash
node backend/scripts/testPaymentLogic.js
```

**Tests:**
- Payment method validation (esewa, khalti, card)
- Card number validation
- Expiry date validation
- CVV validation
- Card formatting
- Transaction ID generation
- Tax calculation
- Amount validation
- Payment status flow

**Expected Result**: 10/10 tests passed ✓

### 2. Payment Integration Test
Tests complete payment flow simulation.

```bash
node backend/scripts/testPaymentIntegration.js
```

**Tests:**
- eSewa payment processing
- Khalti payment processing
- Card payment processing
- Invalid card rejection
- Duplicate payment prevention
- Amount validation
- Payment method validation
- Real-time notification flow
- Transaction record creation

**Expected Result**: 9/9 tests passed ✓

### 3. Payment System Test (Database)
Comprehensive database integration test.

```bash
node backend/scripts/testPaymentSystem.js
```

**Tests:**
- eSewa payment with database
- Khalti payment with database
- Card payment with database
- Invoice payment
- Duplicate payment prevention
- Payment validation
- Transaction records
- Payment statistics

**Note**: Requires database connection.

## Manual Testing

### Test Scenario 1: Room Service Order Payment

1. **Login as Guest**
   - Go to https://stay-haven-eight.vercel.app/guest/login
   - Email: `guest@test.com`
   - Password: `Guest@123`

2. **Place Room Service Order**
   - Navigate to "Room Service" tab
   - Browse menu items
   - Add items to cart
   - Place order
   - Wait for staff to send bill

3. **Receive Bill Notification**
   - Check for toast notification: "📄 New bill received"
   - Navigate to "Billing" tab
   - Verify order appears in invoices list

4. **Make Payment**
   - Click "Pay Now" button
   - Payment modal opens
   - Verify invoice details displayed correctly
   - Select payment method (eSewa, Khalti, or Card)

5. **eSewa Payment**
   - Select "eSewa" payment method
   - Click "Pay Rs. [amount]"
   - Wait for processing
   - Verify success message
   - Verify modal closes automatically

6. **Khalti Payment**
   - Select "Khalti" payment method
   - Click "Pay Rs. [amount]"
   - Wait for processing
   - Verify success message

7. **Card Payment**
   - Select "Credit/Debit Card" payment method
   - Enter card details:
     - Card Number: `4111 1111 1111 1111`
     - Name: `TEST USER`
     - Expiry: `12/27`
     - CVV: `123`
   - Click "Pay Rs. [amount]"
   - Wait for processing
   - Verify success message

8. **Verify Payment Confirmation**
   - Check for success toast: "Payment successful!"
   - Verify invoice status changes to "paid"
   - Verify "Pay Now" button disappears
   - Verify outstanding balance updates

### Test Scenario 2: Real-Time Updates

1. **Open Two Browser Windows**
   - Window 1: Guest Dashboard (Billing tab)
   - Window 2: Staff Dashboard (Orders view)

2. **Staff Sends Bill**
   - In Window 2 (Staff), send bill for an order
   - In Window 1 (Guest), verify notification appears
   - Verify invoice appears in billing list

3. **Guest Makes Payment**
   - In Window 1 (Guest), click "Pay Now"
   - Complete payment
   - In Window 2 (Staff), verify payment notification
   - Verify order status updates to "paid"

### Test Scenario 3: Error Handling

1. **Invalid Card Number**
   - Select Card payment
   - Enter invalid card: `123`
   - Click Pay
   - Verify error: "Please enter a valid card number"

2. **Missing Card Details**
   - Select Card payment
   - Leave name field empty
   - Click Pay
   - Verify error: "Please enter cardholder name"

3. **Duplicate Payment**
   - Pay an invoice
   - Try to pay the same invoice again
   - Verify "Pay Now" button is disabled/hidden

4. **Network Error**
   - Disconnect internet
   - Try to make payment
   - Verify error message: "Payment processing failed"
   - Verify retry option available

### Test Scenario 4: Mobile Responsiveness

1. **Open on Mobile Device**
   - Login as guest
   - Navigate to Billing tab
   - Click "Pay Now"

2. **Verify Modal Display**
   - Modal should be full-screen on mobile
   - All elements should be readable
   - Buttons should be easily tappable
   - Card input fields should be properly sized

3. **Complete Payment**
   - Select payment method
   - Enter details (if card)
   - Complete payment
   - Verify success message

## Verification Checklist

### Frontend
- [ ] Payment modal opens correctly
- [ ] All payment methods displayed
- [ ] Card input validation works
- [ ] Card number formatting works (spaces every 4 digits)
- [ ] Expiry date formatting works (MM/YY)
- [ ] CVV input accepts 3-4 digits only
- [ ] Loading state shows during processing
- [ ] Success message displays after payment
- [ ] Error message displays on failure
- [ ] Modal closes after successful payment
- [ ] Invoice list refreshes after payment
- [ ] Outstanding balance updates correctly
- [ ] Real-time notifications work
- [ ] Mobile responsive design

### Backend
- [ ] Payment endpoint accepts all methods
- [ ] Payment validation works
- [ ] Order status updates to "paid"
- [ ] Payment transaction record created
- [ ] WebSocket notifications sent to guest
- [ ] WebSocket notifications sent to staff
- [ ] Duplicate payment prevention works
- [ ] Error handling works correctly
- [ ] Sentry error logging works

### Database
- [ ] Order paymentStatus updates
- [ ] Order paymentMethod recorded
- [ ] Order paidAt timestamp set
- [ ] Order paymentReference saved
- [ ] PaymentTransaction record created
- [ ] Transaction transactionId generated
- [ ] Invoice status updates (if invoice payment)
- [ ] Invoice balance updates correctly

## Common Issues & Solutions

### Issue 1: Payment Modal Not Opening
**Solution**: Check browser console for errors. Verify invoice data is loaded.

### Issue 2: Payment Fails with 400 Error
**Solution**: Check order schema has all payment methods in enum. Verify backend logs.

### Issue 3: Real-Time Updates Not Working
**Solution**: Verify WebSocket connection. Check Socket.IO events in browser DevTools.

### Issue 4: Card Validation Not Working
**Solution**: Check card number format. Ensure spaces are removed before validation.

### Issue 5: Outstanding Balance Not Updating
**Solution**: Verify invoice refresh after payment. Check API response.

## Performance Testing

### Load Test
1. Create 10 orders
2. Send bills for all orders
3. Make payments simultaneously
4. Verify all payments process correctly
5. Check for race conditions

### Stress Test
1. Make rapid consecutive payments
2. Verify duplicate prevention works
3. Check transaction record integrity
4. Verify no data corruption

## Security Testing

### Test 1: Authorization
- Try to pay another user's order
- Verify 403/404 error

### Test 2: Payment Method Validation
- Send invalid payment method in API request
- Verify 400 error with proper message

### Test 3: Amount Manipulation
- Try to pay less than invoice amount
- Verify backend validates amount

### Test 4: Card Data Security
- Verify card details not logged
- Check card details not stored in database
- Verify only last 4 digits stored (if needed)

## Production Readiness

### Before Going Live
- [ ] Replace simulated payment with real eSewa API
- [ ] Replace simulated payment with real Khalti API
- [ ] Integrate real payment gateway for cards
- [ ] Set up payment webhook handlers
- [ ] Configure payment success/failure URLs
- [ ] Set up payment reconciliation
- [ ] Enable payment logging
- [ ] Set up payment monitoring
- [ ] Configure payment alerts
- [ ] Test with real payment credentials
- [ ] Verify PCI compliance (for card payments)
- [ ] Set up payment refund process
- [ ] Configure payment dispute handling

### Monitoring
- Monitor payment success rate
- Track payment failures
- Monitor transaction processing time
- Track payment method usage
- Monitor WebSocket connection stability
- Track notification delivery rate

## Support

### For Issues
1. Check browser console for errors
2. Check backend logs in Render dashboard
3. Verify database records
4. Check Sentry for error reports
5. Review WebSocket connection status

### Contact
- Email: citizshrestha17@gmail.com
- GitHub: https://github.com/Citizshrestha/StayHaven

## Next Steps

1. **Test in Browser**
   - Login with test account
   - Place order and receive bill
   - Test all payment methods
   - Verify real-time updates

2. **Production Integration**
   - Integrate eSewa API
   - Integrate Khalti API
   - Set up payment webhooks
   - Configure production credentials

3. **Monitoring Setup**
   - Set up payment analytics
   - Configure error alerts
   - Monitor transaction success rate

4. **Documentation**
   - Update API documentation
   - Create user guide
   - Document payment flow
   - Create troubleshooting guide
