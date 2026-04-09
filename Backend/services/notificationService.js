/**
 * Notification Service
 * Handles email, SMS, and WhatsApp notifications
 * Production-ready with proper error handling and logging
 */

import nodemailer from 'nodemailer';

/**
 * Send Email using Nodemailer
 * Supports Gmail, SendGrid, AWS SES, and other SMTP providers
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Configure email transporter based on environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD, // Support both var names
      },
    });

    // Verify transporter configuration
    await transporter.verify();

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'StayHaven'}" <${process.env.SMTP_FROM_EMAIL || process.env.SENDER_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      provider: 'email',
    };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Send SMS using multiple providers
 * Tries free options first, then falls back to Twilio
 */
export const sendSMS = async ({ to, message }) => {
  try {
    // Option 1: Try Fast2SMS (Free for India, cheap for Nepal)
    if (process.env.FAST2SMS_API_KEY) {
      return await sendSMSViaFast2SMS({ to, message });
    }
    
    // Option 2: Try TextBelt (Free - 1 SMS/day per phone number)
    if (process.env.USE_TEXTBELT === 'true') {
      return await sendSMSViaTextBelt({ to, message });
    }
    
    // Option 3: Try MSG91 (Free trial, then cheap)
    if (process.env.MSG91_AUTH_KEY) {
      return await sendSMSViaMSG91({ to, message });
    }
    
    // Option 4: Fall back to Twilio (Paid)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      return await sendSMSViaTwilio({ to, message });
    }
    
    throw new Error('No SMS provider configured. Please set up Fast2SMS, TextBelt, MSG91, or Twilio in environment variables.');
  } catch (error) {
    console.error('❌ SMS send error:', error);
    throw error;
  }
};

/**
 * Fast2SMS - Free for India, works for Nepal too
 * Sign up: https://www.fast2sms.com/
 * Free credits on signup, very cheap rates
 */
const sendSMSViaFast2SMS = async ({ to, message }) => {
  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'v3',
        sender_id: process.env.FAST2SMS_SENDER_ID || 'TXTIND',
        message: message,
        language: 'english',
        flash: 0,
        numbers: to.replace(/\+/g, '').replace(/\s/g, ''), // Remove + and spaces
      }),
    });

    const data = await response.json();
    
    if (data.return === true) {
      console.log('✅ SMS sent via Fast2SMS:', data.message_id);
      return {
        success: true,
        messageId: data.message_id,
        provider: 'fast2sms',
      };
    }
    
    throw new Error(data.message || 'Fast2SMS delivery failed');
  } catch (error) {
    console.error('❌ Fast2SMS error:', error);
    throw new Error(`Fast2SMS delivery failed: ${error.message}`);
  }
};

/**
 * TextBelt - Completely FREE (1 SMS per day per phone number)
 * No signup required! Perfect for testing and low-volume use
 * Website: https://textbelt.com/
 */
const sendSMSViaTextBelt = async ({ to, message }) => {
  try {
    const response = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: to,
        message: message,
        key: process.env.TEXTBELT_API_KEY || 'textbelt', // 'textbelt' is the free key
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ SMS sent via TextBelt:', data.textId);
      return {
        success: true,
        messageId: data.textId,
        provider: 'textbelt',
        quotaRemaining: data.quotaRemaining,
      };
    }
    
    throw new Error(data.error || 'TextBelt delivery failed');
  } catch (error) {
    console.error('❌ TextBelt error:', error);
    throw new Error(`TextBelt delivery failed: ${error.message}`);
  }
};

/**
 * MSG91 - Free trial credits, then very cheap
 * Sign up: https://msg91.com/
 * Good for India and Nepal
 */
const sendSMSViaMSG91 = async ({ to, message }) => {
  try {
    const response = await fetch(`https://api.msg91.com/api/v5/flow/`, {
      method: 'POST',
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        flow_id: process.env.MSG91_FLOW_ID,
        sender: process.env.MSG91_SENDER_ID || 'MSGIND',
        mobiles: to.replace(/\+/g, '').replace(/\s/g, ''),
        message: message,
      }),
    });

    const data = await response.json();
    
    if (data.type === 'success') {
      console.log('✅ SMS sent via MSG91:', data.message);
      return {
        success: true,
        messageId: data.message,
        provider: 'msg91',
      };
    }
    
    throw new Error(data.message || 'MSG91 delivery failed');
  } catch (error) {
    console.error('❌ MSG91 error:', error);
    throw new Error(`MSG91 delivery failed: ${error.message}`);
  }
};

/**
 * Twilio SMS - Paid service (fallback)
 */
const sendSMSViaTwilio = async ({ to, message }) => {
  try {
    // Check if Twilio is installed
    let twilio;
    try {
      twilio = await import('twilio');
    } catch (importError) {
      throw new Error('Twilio package not installed. Run: npm install twilio');
    }

    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log('✅ SMS sent via Twilio:', result.sid);
    return {
      success: true,
      messageId: result.sid,
      provider: 'twilio',
    };
  } catch (error) {
    console.error('❌ Twilio SMS error:', error);
    throw new Error(`Twilio SMS delivery failed: ${error.message}`);
  }
};

/**
 * Send WhatsApp message using Twilio WhatsApp API
 * Production-ready WhatsApp delivery
 */
export const sendWhatsApp = async ({ to, message }) => {
  try {
    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
      throw new Error('Twilio WhatsApp credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in environment variables.');
    }

    // Dynamic import of Twilio
    const twilio = await import('twilio');
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Format phone numbers for WhatsApp (must include whatsapp: prefix)
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    // Send WhatsApp message
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber,
    });

    console.log('✅ WhatsApp message sent successfully:', result.sid);
    return {
      success: true,
      messageId: result.sid,
      provider: 'twilio-whatsapp',
    };
  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    throw new Error(`WhatsApp delivery failed: ${error.message}`);
  }
};

/**
 * Generate HTML email template for bill
 */
export const generateBillEmailHTML = (billData) => {
  const { orderNumber, hotelName, hotelAddress, hotelPhone, location, customerName, items, subtotal, tax, total, date } = billData;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bill - Order #${orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #0EA5A0; padding-bottom: 20px; margin-bottom: 20px; }
    .hotel-name { font-size: 24px; font-weight: bold; color: #0EA5A0; margin-bottom: 5px; }
    .hotel-info { font-size: 14px; color: #666; }
    .bill-details { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .bill-details div { display: flex; justify-content: space-between; margin: 8px 0; }
    .bill-details strong { color: #333; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #0EA5A0; color: white; padding: 12px; text-align: left; }
    .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
    .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd; }
    .totals div { display: flex; justify-content: space-between; margin: 8px 0; font-size: 16px; }
    .grand-total { font-size: 20px; font-weight: bold; color: #0EA5A0; padding-top: 10px; border-top: 2px solid #0EA5A0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
    .payment-note { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="hotel-name">${hotelName}</div>
    <div class="hotel-info">${hotelAddress}<br>Tel: ${hotelPhone}</div>
  </div>

  <div class="bill-details">
    <div><strong>Bill No:</strong> <span>#${orderNumber}</span></div>
    <div><strong>Date:</strong> <span>${new Date(date).toLocaleString('en-NP')}</span></div>
    <div><strong>Location:</strong> <span>${location}</span></div>
    <div><strong>Customer:</strong> <span>${customerName}</span></div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>ITEM</th>
        <th style="text-align: center;">QTY</th>
        <th style="text-align: right;">PRICE</th>
        <th style="text-align: right;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">Rs. ${item.price.toFixed(2)}</td>
          <td style="text-align: right;">Rs. ${item.total.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal:</span> <span>Rs. ${subtotal.toFixed(2)}</span></div>
    <div><span>VAT (13%):</span> <span>Rs. ${tax.toFixed(2)}</span></div>
    <div class="grand-total"><span>GRAND TOTAL:</span> <span>Rs. ${total.toFixed(2)}</span></div>
  </div>

  <div class="payment-note">
    <strong>⚠️ Payment Required</strong><br>
    Please make payment for this bill at your earliest convenience. You can pay at the reception or through your guest dashboard.
  </div>

  <div class="footer">
    <p>Thank you for your visit!<br>We hope to see you again soon.</p>
    <p style="font-size: 12px; color: #999;">This is an automated email. Please do not reply.</p>
  </div>
</body>
</html>
  `;
};

/**
 * Generate plain text message for SMS/WhatsApp
 */
export const generateBillTextMessage = (billData) => {
  const { orderNumber, hotelName, location, customerName, items, total } = billData;

  let message = `📄 BILL - ${hotelName}\n\n`;
  message += `Order #${orderNumber}\n`;
  message += `${location} • ${customerName}\n`;
  message += `\n--- ITEMS ---\n`;
  
  items.forEach(item => {
    message += `${item.quantity}× ${item.name} - Rs. ${item.total.toFixed(2)}\n`;
  });
  
  message += `\n💰 TOTAL: Rs. ${total.toFixed(2)}\n`;
  message += `\n⚠️ Please make payment at reception or via your guest dashboard.\n`;
  message += `\nThank you for your visit!`;

  return message;
};
