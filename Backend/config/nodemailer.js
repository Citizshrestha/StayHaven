import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
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
    return { success: false, message: "Failed to send email", error };
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
