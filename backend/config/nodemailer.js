import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  // ponytail: self-signed cert issue in dev environments, remove in production
  tls: process.env.NODE_ENV === 'production' ? {} : { rejectUnauthorized: false },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Reusable function to send email
export const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${mailOptions.to}:`, info.messageId);
    return { success: true, message: "Email sent successfully", info };
  } catch (error) {
    console.error("❌ Email error:", {
      message: error.message,
      code: error.code,
      response: error.response || "No response",
    });
    // Throw error so callers can detect failure
    throw error;
  }
};

// Test email function (optional - for testing SMTP credentials)
export const testEmailConnection = async () => {
  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: 'test@example.com',
    subject: 'Test Email from StayHaven',
    text: 'This is a test email to verify SMTP credentials.',
  };

  const result = await sendEmail(mailOptions);
  return result;
};
