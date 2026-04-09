# Installing Twilio for SMS and WhatsApp

Twilio is optional and only needed if you want to send SMS or WhatsApp messages.

## Installation

```bash
cd Backend
npm install twilio
```

## Why Optional?

- Email notifications work without Twilio (using nodemailer)
- App notifications work without Twilio (using Socket.IO)
- SMS and WhatsApp require Twilio account and credentials

## If You Don't Install Twilio

The system will still work perfectly for:
- ✅ App Notifications (instant, free)
- ✅ Email Notifications (using Gmail/SendGrid/AWS SES)

SMS and WhatsApp will show an error message asking you to configure Twilio credentials.

## To Enable SMS/WhatsApp

1. Install Twilio:
   ```bash
   npm install twilio
   ```

2. Set up Twilio account (see NOTIFICATION_SETUP.md)

3. Add credentials to .env:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_WHATSAPP_NUMBER=+14155238886
   ```

4. Restart server

That's it! SMS and WhatsApp will now work.
