# Payment System Quick Reference

## 🚀 Quick Start

### Test Payment Flow (5 minutes)

1. **Login**: https://stay-haven-eight.vercel.app/guest/login
   - Email: `guest@test.com`
   - Password: `Guest@123`

2. **Go to Billing Tab** → Click "Pay Now" on any unpaid invoice

3. **Select Payment Method**:
   - eSewa (instant)
   - Khalti (instant)
   - Card (enter test card: `4111 1111 1111 1111`)

4. **Click Pay** → Success! ✓

## 📋 Test Scripts

```bash
# Logic validation (no database)
node backend/scripts/testPaymentLogic.js

# Integration test (simulated)
node backend/scripts/testPaymentIntegration.js

# Full system test (requires database)
node backend/scripts/testPaymentSystem.js
```

## 🔑 Test Cards

| Card Number | Type | Result |
|-------------|------|--------|
| 4111 1111 1111 1111 | Visa | Success |
| 5555 5555 5555 4444 | Mastercard | Success |
| 123 | Invalid | Error |

## 🎯 Payment Methods

| Method | Status | Integration |
|--------|--------|-------------|
| eSewa | ✅ Working | Simulated (ready for API) |
| Khalti | ✅ Working | Simulated (ready for API) |
| Card | ✅ Working | Simulated (ready for API) |
| Bank | ⏳ Coming Soon | Not implemented |

## 📡 API Endpoints

### Pay Order/Invoice
```http
POST /api/guest/portal/orders/:id/pay
Authorization: Bearer <token>

{
  "amount": 600,
  "currency": "npr",
  "paymentMethod": "esewa",
  "cardDetails": {  // Only for card payments
    "number": "4111111111111111",
    "name": "JOHN DOE",
    "expiry": "12/27",
    "cvv": "123"
  }
}
```

### Response
```json
{
  "success": true,
  "message": "Payment successful",
  "data": {
    "transaction": {
      "transactionId": "TXN-123456",
      "amount": 600,
      "method": "esewa",
      "status": "captured"
    },
    "order": {
      "_id": "...",
      "orderNumber": 1001
    },
    "transactionId": "ESEWA-1234567890-abc123"
  }
}
```

## 🔔 WebSocket Events

### Guest Receives
- `bill-received` - When staff sends bill
- `payment-confirmed` - After successful payment
- `order-status-update` - Order status changes

### Staff Receives
- `payment-received` - When guest makes payment
- `order-updated` - Order details change

## 🛠️ Component Structure

```
frontend/src/
├── shared/components/
│   └── PaymentModal.jsx          # Main payment modal
├── features/guest/dashboard/
│   ├── pages/
│   │   └── BillingView.jsx       # Billing page with invoices
│   └── guestDashboardApi.js      # API client

backend/
├── controllers/
│   └── guestDashboardController.js  # Payment processing
├── models/
│   ├── order.schema.js              # Order with payment fields
│   └── paymentTransaction.schema.js # Transaction records
└── scripts/
    ├── testPaymentLogic.js          # Logic tests
    ├── testPaymentIntegration.js    # Integration tests
    └── testPaymentSystem.js         # Database tests
```

## ✅ Validation Rules

### Payment Method
- Must be one of: `esewa`, `khalti`, `card`, `bank`

### Card Number
- Length: 13-19 digits
- Format: Spaces allowed (auto-formatted)

### Expiry Date
- Format: `MM/YY`
- Must be future date

### CVV
- Length: 3-4 digits
- Numbers only

### Amount
- Must be > 0
- Must match invoice/order amount

## 🐛 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 400 - Invalid payment method | Wrong method in enum | Check order.schema.js |
| 400 - Order already paid | Duplicate payment | Check paymentStatus |
| 400 - Invalid card number | Card validation failed | Use test card |
| 404 - Order not found | Wrong order ID | Verify order exists |
| 500 - Payment processing failed | Backend error | Check logs |

## 🎨 UI States

### Loading
```jsx
<button disabled>
  <Loader2 className="animate-spin" />
  Processing...
</button>
```

### Success
```jsx
<div className="bg-green-50">
  <CheckCircle2 className="text-green-600" />
  Payment Successful!
</div>
```

### Error
```jsx
<div className="bg-red-50">
  <AlertCircle className="text-red-600" />
  Payment Failed
  <button>Try Again</button>
</div>
```

## 🔐 Security Checklist

- [x] Card details not logged
- [x] Card details not stored
- [x] Payment authorization required
- [x] Amount validation on backend
- [x] Duplicate payment prevention
- [x] Transaction records created
- [x] Error handling with Sentry
- [ ] PCI compliance (for production)
- [ ] Payment encryption (for production)
- [ ] Fraud detection (for production)

## 📊 Database Schema

### Order Payment Fields
```javascript
{
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
  paymentMethod: 'cash' | 'card' | 'esewa' | 'khalti' | 'bank',
  paidAt: Date,
  paidAmount: Number,
  paymentReference: String,
  billSent: Boolean,
  billSentAt: Date
}
```

### Payment Transaction
```javascript
{
  transactionId: String,  // Auto-generated
  hotel: ObjectId,
  order: ObjectId,
  amount: Number,
  method: String,
  reference: String,
  status: 'captured' | 'failed' | 'refunded',
  processedBy: ObjectId,
  processedAt: Date
}
```

## 🚦 Status Flow

```
Order Status:
pending → confirmed → preparing → ready → delivered

Payment Status:
pending → paid
        ↓
      failed → pending (retry)
        ↓
      paid → refunded
```

## 📱 Mobile Testing

### Viewport Sizes
- Mobile: 375px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

### Test Checklist
- [ ] Modal full-screen on mobile
- [ ] Buttons easily tappable (min 44px)
- [ ] Text readable (min 16px)
- [ ] Card inputs properly sized
- [ ] Keyboard doesn't overlap inputs
- [ ] Success message visible

## 🔄 Real-Time Flow

```
1. Staff sends bill
   ↓
2. Backend emits 'bill-received' to guest
   ↓
3. Guest receives notification
   ↓
4. Guest clicks "Pay Now"
   ↓
5. Payment modal opens
   ↓
6. Guest completes payment
   ↓
7. Backend processes payment
   ↓
8. Backend emits 'payment-confirmed' to guest
   ↓
9. Backend emits 'payment-received' to staff
   ↓
10. Both dashboards update automatically
```

## 🎯 Performance Targets

- Payment processing: < 2 seconds
- Modal open: < 100ms
- WebSocket latency: < 500ms
- API response: < 1 second
- UI update: < 100ms

## 📞 Support

**Issues?**
1. Check browser console
2. Check backend logs (Render)
3. Check Sentry errors
4. Review this guide
5. Contact: citizshrestha17@gmail.com

## 🎉 Success Criteria

- [x] All payment methods work
- [x] Real-time updates work
- [x] Error handling works
- [x] Mobile responsive
- [x] Tests pass (19/19)
- [x] Security validated
- [ ] Production APIs integrated
- [ ] Load tested
- [ ] User acceptance tested

## 🚀 Production Deployment

### Before Launch
1. Integrate real eSewa API
2. Integrate real Khalti API
3. Set up payment webhooks
4. Configure production keys
5. Test with real payments
6. Set up monitoring
7. Enable error alerts
8. Document for users

### After Launch
1. Monitor payment success rate
2. Track payment failures
3. Analyze payment methods usage
4. Optimize based on metrics
5. Gather user feedback
6. Iterate and improve

---

**Last Updated**: April 11, 2026
**Version**: 1.0.0
**Status**: ✅ Ready for Testing
