# FREE SMS Options - No Credit Card Required! 🎉

This guide shows you how to send SMS for FREE or very cheap (less than $0.002 per SMS).

---

## 🆓 Option 1: TextBelt (COMPLETELY FREE)

**Best for:** Testing, low-volume use, personal projects

### Features:
- ✅ **100% FREE** - No credit card, no signup required!
- ✅ 1 SMS per day per phone number
- ✅ Works internationally
- ✅ No setup required
- ✅ Instant activation

### Setup (30 seconds):

1. **Add to .env:**
```env
USE_TEXTBELT=true
TEXTBELT_API_KEY=textbelt
```

2. **Restart server**

That's it! You can now send 1 free SMS per day to each phone number.

### Upgrade (Optional):
- Paid key: $10 for 1,000 SMS ($0.01 per SMS)
- Get key at: https://textbelt.com/purchase/

### Limitations:
- 1 SMS per day per phone number (free tier)
- May have delivery delays during peak times
- Not recommended for high-volume production

### Perfect For:
- ✅ Testing the SMS feature
- ✅ Personal projects
- ✅ Low-volume notifications
- ✅ Proof of concept

---

## 💰 Option 2: Fast2SMS (FREE Credits + Very Cheap)

**Best for:** India and Nepal, production use

### Features:
- ✅ **FREE credits** on signup (10-50 SMS)
- ✅ Very cheap: ₹0.15 per SMS (~$0.002)
- ✅ High delivery rate
- ✅ Works great in India and Nepal
- ✅ No monthly fees

### Setup (5 minutes):

1. **Sign up:** https://www.fast2sms.com/
   - Use your email and phone number
   - Verify your account
   - Get FREE credits instantly!

2. **Get API Key:**
   - Go to Dashboard → API Keys
   - Copy your API key

3. **Add to .env:**
```env
FAST2SMS_API_KEY=your_api_key_here
FAST2SMS_SENDER_ID=TXTIND
```

4. **Restart server**

### Pricing:
- Free: 10-50 SMS on signup
- Paid: ₹0.15 per SMS (~$0.002)
- Bulk: ₹0.10 per SMS for 10,000+ SMS

### Perfect For:
- ✅ Production use in India/Nepal
- ✅ High-volume SMS
- ✅ Reliable delivery
- ✅ Very affordable

---

## 🎁 Option 3: MSG91 (FREE Trial + Cheap)

**Best for:** India and Nepal, professional use

### Features:
- ✅ **FREE trial** - 100 SMS
- ✅ Very cheap: ₹0.15 per SMS (~$0.002)
- ✅ Professional features
- ✅ High delivery rate
- ✅ Good for India and Nepal

### Setup (5 minutes):

1. **Sign up:** https://msg91.com/
   - Create account
   - Verify email and phone
   - Get 100 FREE SMS credits!

2. **Get Credentials:**
   - Go to Dashboard
   - Copy Auth Key
   - Create a Flow (template) for SMS
   - Copy Flow ID

3. **Add to .env:**
```env
MSG91_AUTH_KEY=your_auth_key_here
MSG91_FLOW_ID=your_flow_id_here
MSG91_SENDER_ID=MSGIND
```

4. **Restart server**

### Pricing:
- Free: 100 SMS trial
- Paid: ₹0.15 per SMS (~$0.002)
- Enterprise: Custom pricing

### Perfect For:
- ✅ Professional projects
- ✅ High-volume SMS
- ✅ India/Nepal market
- ✅ Advanced features

---

## 💳 Option 4: Twilio (PAID - Most Reliable)

**Best for:** International use, guaranteed delivery

### Features:
- ✅ Works worldwide
- ✅ Highest delivery rate
- ✅ Professional support
- ✅ WhatsApp integration
- ❌ Costs money (~$0.05 per SMS)

### Setup:
See `NOTIFICATION_SETUP.md` for Twilio setup.

### Pricing:
- Trial: $15 free credits
- Paid: ~$0.05 per SMS (varies by country)
- Nepal: ~$0.05 per SMS

### Perfect For:
- ✅ International SMS
- ✅ Mission-critical notifications
- ✅ WhatsApp integration
- ✅ Enterprise use

---

## 📊 Comparison Table

| Provider | Free Credits | Cost per SMS | Signup Required | Best For |
|----------|-------------|--------------|-----------------|----------|
| **TextBelt** | 1/day/number | $0.01 (paid) | ❌ No | Testing |
| **Fast2SMS** | 10-50 SMS | $0.002 | ✅ Yes | India/Nepal |
| **MSG91** | 100 SMS | $0.002 | ✅ Yes | Professional |
| **Twilio** | $15 credit | $0.05 | ✅ Yes | International |

---

## 🎯 Recommended Setup

### For Testing:
```env
USE_TEXTBELT=true
TEXTBELT_API_KEY=textbelt
```
**Cost:** FREE forever (1 SMS/day/number)

### For Production (India/Nepal):
```env
FAST2SMS_API_KEY=your_api_key
FAST2SMS_SENDER_ID=TXTIND
```
**Cost:** ~$0.002 per SMS (very cheap!)

### For International:
```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```
**Cost:** ~$0.05 per SMS

---

## 🚀 Quick Start (FREE)

Want to test SMS right now? Use TextBelt:

1. **Add to .env:**
```env
USE_TEXTBELT=true
```

2. **Restart server:**
```bash
npm start
```

3. **Send a test SMS:**
- Login as staff
- Mark an order as delivered
- Click "Send Bill"
- Select "💬 SMS"
- Enter phone number
- Click "Send Bill"

Done! You just sent a FREE SMS! 🎉

---

## 💡 Pro Tips

### Maximize Free Usage:
1. Use **TextBelt** for testing (1 free SMS/day/number)
2. Use **Fast2SMS** free credits for initial production
3. Switch to paid when you run out of free credits

### Save Money:
1. Use **App Notification** as primary method (FREE)
2. Use **Email** as backup (FREE with Gmail)
3. Use **SMS** only when necessary
4. Use **Fast2SMS** or **MSG91** instead of Twilio (10x cheaper)

### Best Practice:
```javascript
// Priority order (cheapest to most expensive):
1. App Notification (FREE)
2. Email (FREE)
3. SMS via Fast2SMS ($0.002)
4. SMS via Twilio ($0.05)
```

---

## 🔧 Troubleshooting

### TextBelt says "Quota exceeded":
- You've sent 1 SMS to this number today
- Wait 24 hours or use a different number
- Or upgrade to paid key ($10 for 1,000 SMS)

### Fast2SMS not working:
- Check API key is correct
- Verify account is activated
- Check phone number format (no + or spaces)
- Ensure you have credits

### MSG91 not working:
- Verify Auth Key is correct
- Check Flow ID is set up
- Ensure phone number format is correct
- Verify you have credits

---

## 📞 Support

### TextBelt:
- Website: https://textbelt.com/
- Docs: https://textbelt.com/docs

### Fast2SMS:
- Website: https://www.fast2sms.com/
- Support: support@fast2sms.com
- Docs: https://docs.fast2sms.com/

### MSG91:
- Website: https://msg91.com/
- Support: support@msg91.com
- Docs: https://docs.msg91.com/

---

## ✅ Summary

**Want FREE SMS?** → Use TextBelt (no signup!)

**Want cheap SMS for India/Nepal?** → Use Fast2SMS or MSG91 (~$0.002 per SMS)

**Want international SMS?** → Use Twilio (~$0.05 per SMS)

**Best recommendation:** Start with TextBelt for testing, then switch to Fast2SMS for production. You'll save 95% compared to Twilio!

---

Need help? Check the main `NOTIFICATION_SETUP.md` guide or contact support.
