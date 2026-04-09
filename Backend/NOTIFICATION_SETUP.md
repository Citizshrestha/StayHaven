# Notification Services Setup Guide

This guide will help you set up production-ready email, SMS, and WhatsApp notifications for the StayHaven bill sending system.

## 📧 Email Setup (SMTP)

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "StayHaven" and click "Generate"
   - Copy the 16-character password

3. **Update .env file**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # App password from step 2
SMTP_FROM_NAME=StayHaven
SMTP_FROM_EMAIL=your-email@gmail.com
```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account**: https://signup.sendgrid.com/
2. **Get API Key**:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Give it "Full Access" permissions
   - Copy the API key

3. **Update .env file**:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxx  # API key from step 2
SMTP_FROM_NAME=StayHaven
SMTP_FROM_EMAIL=verified-sender@yourdomain.com
```

4. **Verify Sender Email**:
   - Go to Settings → Sender Authentication
   - Verify your sender email address

### Option 3: AWS SES (Best for High Volume)

1. **Create AWS Account**: https://aws.amazon.com/
2. **Set up SES**:
   - Go to AWS SES Console
   - Verify your domain or email
   - Create SMTP credentials

3. **Update .env file**:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_aws_access_key
SMTP_PASS=your_aws_secret_key
SMTP_FROM_NAME=StayHaven
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

---

## 💬 SMS Setup

### 🆓 FREE Option: TextBelt (Recommended for Testing)

**No signup required! Completely FREE!**

1. **Add to .env**:
```env
USE_TEXTBELT=true
TEXTBELT_API_KEY=textbelt
```

2. **Restart server**

That's it! You can now send 1 free SMS per day to each phone number.

**Limitations:**
- 1 SMS per day per phone number
- May have delivery delays

**Perfect for:** Testing, personal projects, low-volume use

---

### 💰 Cheap Option: Fast2SMS (Recommended for Production)

**FREE credits on signup + Very cheap rates (~$0.002 per SMS)**

1. **Sign up**: https://www.fast2sms.com/
   - Get 10-50 FREE SMS credits on signup!

2. **Get API Key**:
   - Go to Dashboard → API Keys
   - Copy your API key

3. **Update .env file**:
```env
FAST2SMS_API_KEY=your_api_key_here
FAST2SMS_SENDER_ID=TXTIND
```

4. **Restart server**

**Pricing:**
- Free: 10-50 SMS on signup
- Paid: ₹0.15 per SMS (~$0.002)
- 10x cheaper than Twilio!

**Perfect for:** Production use in India/Nepal

---

### 🎁 Alternative: MSG91

**FREE trial (100 SMS) + Cheap rates (~$0.002 per SMS)**

1. **Sign up**: https://msg91.com/
   - Get 100 FREE SMS credits!

2. **Get Credentials**:
   - Copy Auth Key from Dashboard
   - Create a Flow and copy Flow ID

3. **Update .env file**:
```env
MSG91_AUTH_KEY=your_auth_key_here
MSG91_FLOW_ID=your_flow_id_here
MSG91_SENDER_ID=MSGIND
```

**Perfect for:** Professional projects in India/Nepal

---

### 💳 Paid Option: Twilio (Most Reliable)

**Only use if you need international SMS or guaranteed delivery**

1. **Create Twilio Account**: https://www.twilio.com/try-twilio
   - Sign up for free trial (includes $15 credit)
   - Verify your phone number

2. **Get Credentials**:
   - Go to Console Dashboard: https://console.twilio.com/
   - Copy your **Account SID** and **Auth Token**

3. **Get Phone Number**:
   - Go to Phone Numbers → Manage → Buy a number
   - Choose a number with SMS capabilities
   - For Nepal: Choose a number that can send to Nepal (+977)

4. **Update .env file**:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio number
```

5. **Test SMS**:
   - During trial, you can only send to verified numbers
   - Add test numbers in Console → Phone Numbers → Verified Caller IDs
   - Upgrade account to send to any number

---

## 📱 WhatsApp Setup (Twilio WhatsApp)

1. **Prerequisites**:
   - Active Twilio account (from SMS setup above)
   - Same Account SID and Auth Token

2. **Enable WhatsApp**:
   - Go to Messaging → Try it out → Try WhatsApp
   - Follow the setup wizard
   - You'll get a Twilio WhatsApp sandbox number

3. **For Production** (requires approval):
   - Go to Messaging → Senders → WhatsApp senders
   - Click "Request to enable my Twilio numbers for WhatsApp"
   - Submit your use case for approval
   - Once approved, you can use your own WhatsApp Business number

4. **Update .env file**:
```env
TWILIO_WHATSAPP_NUMBER=+14155238886  # Twilio sandbox number
# Or your approved number: +1234567890
```

5. **Test WhatsApp**:
   - Send "join [sandbox-keyword]" to the Twilio WhatsApp number
   - Your number is now connected to the sandbox
   - Test sending bills via WhatsApp

---

## 🔔 App Notification (Already Configured)

App notifications work out of the box using Socket.IO. No additional setup required!

---

## 🧪 Testing the Setup

### Test Email:
```bash
curl -X POST http://localhost:5000/api/staff/orders/ORDER_ID/send-bill \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "method": "email",
    "email": "test@example.com"
  }'
```

### Test SMS:
```bash
curl -X POST http://localhost:5000/api/staff/orders/ORDER_ID/send-bill \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "method": "sms",
    "phone": "+9779812345678"
  }'
```

### Test WhatsApp:
```bash
curl -X POST http://localhost:5000/api/staff/orders/ORDER_ID/send-bill \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "method": "whatsapp",
    "phone": "+9779812345678"
  }'
```

---

## 💰 Pricing (as of 2024)

### Email:
- **Gmail**: Free (with limits: 500 emails/day)
- **SendGrid**: Free tier (100 emails/day), Paid plans from $15/month
- **AWS SES**: $0.10 per 1,000 emails

### SMS:
- **Twilio**: ~$0.0075 per SMS (varies by country)
- Nepal: ~$0.05 per SMS

### WhatsApp:
- **Twilio**: Free for first 1,000 conversations/month
- Then $0.005 - $0.009 per conversation

---

## 🚨 Troubleshooting

### Email not sending:
- Check SMTP credentials are correct
- Verify sender email is verified (SendGrid/SES)
- Check spam folder
- Enable "Less secure app access" for Gmail (not recommended)

### SMS not delivering:
- Verify phone number format (+country_code + number)
- Check Twilio account balance
- Verify destination number is not blocked
- Check Twilio logs in Console

### WhatsApp not working:
- Ensure recipient has joined sandbox (for testing)
- Check WhatsApp number format (must include whatsapp: prefix)
- Verify Twilio WhatsApp is enabled
- Check message template compliance

---

## 📚 Additional Resources

- **Nodemailer Docs**: https://nodemailer.com/
- **Twilio SMS Docs**: https://www.twilio.com/docs/sms
- **Twilio WhatsApp Docs**: https://www.twilio.com/docs/whatsapp
- **SendGrid Docs**: https://docs.sendgrid.com/
- **AWS SES Docs**: https://docs.aws.amazon.com/ses/

---

## 🔒 Security Best Practices

1. **Never commit .env file** to version control
2. **Use environment variables** for all credentials
3. **Rotate API keys** regularly
4. **Enable 2FA** on all service accounts
5. **Monitor usage** to detect unusual activity
6. **Use separate credentials** for dev/staging/production
7. **Implement rate limiting** to prevent abuse

---

## ✅ Production Checklist

- [ ] Email service configured and tested
- [ ] SMS service configured and tested (if using)
- [ ] WhatsApp service configured and tested (if using)
- [ ] All credentials stored in environment variables
- [ ] Sender email/phone verified
- [ ] Test notifications sent successfully
- [ ] Error handling and logging in place
- [ ] Rate limiting configured
- [ ] Monitoring and alerts set up
- [ ] Backup notification method configured

---

Need help? Check the logs in `Backend/logs/` or contact support.
