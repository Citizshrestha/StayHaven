import { Booking } from "../models/booking.schema.js";
import { Guest } from "../models/guest.schema.js";
import { Hotel } from "../models/hotel.schema.js";
import { sendEmail } from "../config/nodemailer.js";
import { ActivityLog } from "../models/activityLog.schema.js";
import { emitToHotel } from "../config/socket.js";

// Helper: get context from request
const getCtx = (req) => {
  const user = req.user;
  const hotel = req._scopedHotelId || req.query.hotelId || user?.assignedProperties?.[0]?._id;
  const company = req.query.companyId || user?.company?._id || user?.company;
  return { hotel, company, userId: user?._id, userName: user?.fullname };
};

// Helper: log activity
const logActivity = async (data) => {
  try {
    const log = await ActivityLog.create(data);
    if (data.hotel) {
      emitToHotel(data.hotel.toString(), "activity-log", log);
    }
    return log;
  } catch {
    /* silently ignore */
  }
};

/**
 * Email Templates
 */
const emailTemplates = {
  bookingConfirmation: {
    subject: "Booking Confirmed - {hotelName}",
    buildHTML: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .booking-ref { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .booking-ref .label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .booking-ref .code { font-size: 24px; font-weight: bold; color: #111827; letter-spacing: 2px; }
          .details { margin: 30px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #6b7280; }
          .value { font-weight: 600; color: #111827; }
          .highlight { background: #fef3c7; padding: 2px 8px; border-radius: 4px; }
          .cta { text-align: center; margin: 30px 0; }
          .cta a { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
          .social-links { margin: 20px 0; }
          .social-links a { margin: 0 10px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed! 🎉</h1>
            <p>We're excited to welcome you to ${data.hotelName}</p>
          </div>

          <div class="content">
            <p>Dear ${data.guestName},</p>
            <p>Thank you for choosing ${data.hotelName}. Your reservation has been confirmed and we look forward to hosting you.</p>

            <div class="booking-ref">
              <div class="label">Booking Reference</div>
              <div class="code">${data.bookingId}</div>
              <div style="margin-top: 10px; font-size: 13px; color: #6b7280;">Confirmation Code: ${data.confirmationCode}</div>
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="label">Guest Name</span>
                <span class="value">${data.guestName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Room Type</span>
                <span class="value">${data.roomType}</span>
              </div>
              <div class="detail-row">
                <span class="label">Check-in</span>
                <span class="value">${data.checkInDate} at 3:00 PM</span>
              </div>
              <div class="detail-row">
                <span class="label">Check-out</span>
                <span class="value">${data.checkOutDate} at 11:00 AM</span>
              </div>
              <div class="detail-row">
                <span class="label">Duration</span>
                <span class="value">${data.nights} night${data.nights > 1 ? 's' : ''}</span>
              </div>
              <div class="detail-row">
                <span class="label">Guests</span>
                <span class="value">${data.adults} Adult${data.adults > 1 ? 's' : ''}${data.children > 0 ? `, ${data.children} Child${data.children > 1 ? 'ren' : ''}` : ''}</span>
              </div>
              <div class="detail-row">
                <span class="label">Total Amount</span>
                <span class="value" style="color: #667eea;">${data.currency} ${data.totalAmount}</span>
              </div>
            </div>

            <div class="info-box">
              <strong>📍 Hotel Address:</strong><br>
              ${data.hotelAddress}<br>
              <strong>📞 Phone:</strong> ${data.hotelPhone}
            </div>

            ${data.specialRequests ? `
            <div class="info-box" style="background: #fef3c7; border-color: #f59e0b;">
              <strong>📝 Special Requests:</strong><br>
              ${data.specialRequests}
            </div>
            ` : ''}

            <div class="cta">
              <a href="${data.manageUrl}">Manage Booking</a>
            </div>

            <p>If you need to modify your reservation or have any questions, please don't hesitate to contact us.</p>

            <p>We look forward to welcoming you!<br><br>
            <strong>The ${data.hotelName} Team</strong></p>
          </div>

          <div class="footer">
            <p>This email was sent regarding your booking at ${data.hotelName}.</p>
            <p>${data.hotelAddress} | ${data.hotelPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  checkInReminder: {
    subject: "Check-in Tomorrow - {hotelName}",
    buildHTML: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .reminder-box { background: #ecfdf5; border: 2px dashed #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .qr-placeholder { background: white; border: 2px solid #e5e7eb; padding: 20px; text-align: center; margin: 20px 0; }
          .qr-code { width: 150px; height: 150px; background: #f3f4f6; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
          .quick-links { margin: 30px 0; }
          .quick-link { display: flex; align-items: center; padding: 15px; background: #f9fafb; margin: 10px 0; border-radius: 8px; text-decoration: none; color: #374151; }
          .quick-link:hover { background: #f3f4f6; }
          .quick-link-icon { width: 40px; height: 40px; background: #dbeafe; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 18px; }
          .cta-button { display: block; background: #10b981; color: white; text-align: center; padding: 15px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .info-item { background: #f9fafb; padding: 15px; border-radius: 8px; }
          .info-item .label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .info-item .value { font-size: 16px; font-weight: 600; color: #111827; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 See You Tomorrow!</h1>
            <p>Your stay at ${data.hotelName} begins soon</p>
          </div>

          <div class="content">
            <p>Dear ${data.guestName},</p>
            <p>This is a friendly reminder that your check-in at ${data.hotelName} is scheduled for tomorrow.</p>

            <div class="reminder-box">
              <div style="font-size: 48px;">🏨</div>
              <h2>Check-in Tomorrow</h2>
              <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${data.checkInDate}</p>
              <p>From 3:00 PM onwards</p>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <div class="label">Booking Reference</div>
                <div class="value">${data.bookingId}</div>
              </div>
              <div class="info-item">
                <div class="label">Room</div>
                <div class="value">${data.roomType}</div>
              </div>
            </div>

            <h3>📱 Quick Check-in Options</h3>

            <div class="quick-links">
              ${data.mobileCheckinEnabled ? `
              <a href="${data.mobileCheckinUrl}" class="quick-link">
                <div class="quick-link-icon">📱</div>
                <div>
                  <strong>Mobile Check-in</strong><br>
                  <small>Check in online and skip the front desk</small>
                </div>
              </a>
              ` : ''}

              <a href="${data.directionsUrl}" class="quick-link">
                <div class="quick-link-icon">🗺️</div>
                <div>
                  <strong>Get Directions</strong><br>
                  <small>Navigate to the hotel</small>
                </div>
              </a>

              <a href="${data.contactUrl}" class="quick-link">
                <div class="quick-link-icon">📞</div>
                <div>
                  <strong>Contact Hotel</strong><br>
                  <small>Need to make changes? Call us</small>
                </div>
              </a>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <strong>🎒 Check-in Tips:</strong><br>
              • Valid ID/Passport required for all guests<br>
              • Credit card used for booking must be presented<br>
              • Early check-in available from 12 PM (subject to availability)
            </div>

            <a href="${data.manageUrl}" class="cta-button">Manage Your Booking</a>

            <p>We can't wait to welcome you to ${data.hotelName}! 🎉</p>
          </div>

          <div class="footer">
            <p>${data.hotelName} | ${data.hotelAddress}</p>
            <p>Need help? Contact us at ${data.hotelPhone}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  checkOutReminder: {
    subject: "Check-out Today - {hotelName}",
    buildHTML: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .checkout-box { background: #fffbeb; border: 2px solid #f59e0b; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .checkout-time { font-size: 36px; font-weight: bold; color: #d97706; margin: 10px 0; }
          .balance-section { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .balance-row { display: flex; justify-content: space-between; padding: 10px 0; }
          .balance-row.total { border-top: 2px solid #111827; margin-top: 10px; padding-top: 15px; font-weight: bold; font-size: 18px; }
          .cta-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
          .cta-button.secondary { background: #6b7280; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
          .review-stars { font-size: 32px; color: #fbbf24; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 Until Next Time!</h1>
            <p>Your check-out details for ${data.hotelName}</p>
          </div>

          <div class="content">
            <p>Dear ${data.guestName},</p>
            <p>We hope you've enjoyed your stay at ${data.hotelName}. Here are your check-out details:</p>

            <div class="checkout-box">
              <div>⏰ Check-out Time</div>
              <div class="checkout-time">${data.checkOutTime}</div>
              <p>Room: ${data.roomNumber}</p>
            </div>

            ${data.hasOutstandingBalance ? `
            <div class="balance-section">
              <h3>💳 Outstanding Balance</h3>
              <div class="balance-row">
                <span>Room charges</span>
                <span>${data.currency} ${data.roomCharges}</span>
              </div>
              ${data.extraCharges ? `
              <div class="balance-row">
                <span>Additional services</span>
                <span>${data.currency} ${data.extraCharges}</span>
              </div>
              ` : ''}
              <div class="balance-row">
                <span>Taxes & Fees</span>
                <span>${data.currency} ${data.taxes}</span>
              </div>
              <div class="balance-row total">
                <span>Total Due</span>
                <span>${data.currency} ${data.totalDue}</span>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${data.paymentUrl}" class="cta-button">Pay Now</a>
              </div>
            </div>
            ` : `
            <div style="background: #d1fae5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3>✅ All Paid Up!</h3>
              <p>Your account is settled. Thank you for your payment.</p>
            </div>
            `}

            <h3>🚪 Express Check-out Options</h3>
            <ul>
              <li><strong>Drop keys</strong> at the express check-out box at reception</li>
              <li><strong>Mobile check-out</strong> available through our app</li>
              <li>Call <strong>${data.hotelPhone}</strong> for late check-out requests</li>
            </ul>

            <div style="border-top: 1px solid #e5e7eb; margin: 30px 0; padding-top: 30px;">
              <h3>How was your stay? 🌟</h3>
              <p>Your feedback helps us improve our service for future guests.</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${data.reviewUrl}" class="cta-button secondary">Leave a Review</a>
              </div>
            </div>

            <p>Thank you for choosing ${data.hotelName}. We hope to welcome you back soon! 🏨</p>
          </div>

          <div class="footer">
            <p><strong>${data.hotelName}</strong></p>
            <p>${data.hotelAddress}</p>
            <p>📞 ${data.hotelPhone} | ✉️ ${data.hotelEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  specialOffer: {
    subject: "Special Offer Just For You - {hotelName}",
    buildHTML: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .offer-badge { display: inline-block; background: #fef3c7; color: #d97706; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
          .offer-title { font-size: 28px; color: #111827; margin: 20px 0; }
          .discount { font-size: 72px; font-weight: bold; color: #ec4899; margin: 10px 0; }
          .cta-button { display: block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-align: center; padding: 20px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: 600; margin: 30px 0; }
          .countdown { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="offer-badge">⭐ EXCLUSIVE OFFER</div>
            <h1>We Miss You! 💝</h1>
          </div>

          <div class="content">
            <p>Dear ${data.guestName},</p>
            <p>As a valued guest who stayed with us ${data.daysSinceStay} days ago, we have an exclusive offer just for you!</p>

            <div style="text-align: center; margin: 30px 0;">
              <div class="discount">${data.discountPercent}% OFF</div>
              <p style="font-size: 18px;">your next stay</p>
            </div>

            <div class="countdown">
              <p>⏰ Offer expires in:</p>
              <strong>${data.expiryDate}</strong>
            </div>

            <p>Use code: <strong style="font-size: 24px; color: #ec4899;">${data.promoCode}</strong></p>

            <a href="${data.bookingUrl}" class="cta-button">Book Now with ${data.discountPercent}% Off</a>
          </div>

          <div class="footer">
            <p>${data.hotelName}</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmation = async (req, res) => {
  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { bookingId, customMessage } = req.body;

    if (!hotel) {
      return res.status(400).json({ success: false, message: "Hotel context required" });
    }

    // Query-scoped by hotel for security (prevent cross-hotel email sending)
    const booking = await Booking.findOne({
      _id: bookingId,
      hotel: hotel
    })
      .populate("room", "type roomNumber")
      .populate("guest", "fullName email")
      .populate("hotel", "name address phone email")
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found or access denied" });
    }

    const hotelData = await Hotel.findById(booking.hotel?._id || booking.hotel).lean();

    const template = emailTemplates.bookingConfirmation;
    const subject = template.subject.replace("{hotelName}", hotelData?.name || "Our Hotel");
    const html = template.buildHTML({
      guestName: booking.guest?.fullName || booking.guestInfo?.name || "Guest",
      hotelName: hotelData?.name || "Our Hotel",
      hotelAddress: hotelData?.address || "",
      hotelPhone: hotelData?.phone || "",
      bookingId: booking.bookingId,
      confirmationCode: booking.confirmationCode || booking.bookingId,
      roomType: booking.room?.type || "Standard Room",
      checkInDate: new Date(booking.checkIn).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      checkOutDate: new Date(booking.checkOut).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      nights: booking.durationNights,
      adults: booking.guests?.adults || 1,
      children: booking.guests?.children || 0,
      totalAmount: booking.totalAmount?.toFixed(2),
      currency: booking.currency || "USD",
      specialRequests: booking.specialRequests,
      manageUrl: `${process.env.CLIENT_URL}/bookings/${booking._id}`,
      customMessage,
    });

    const emailResult = await sendEmail({
      from: process.env.SENDER_EMAIL,
      to: booking.guest?.email || booking.guestInfo?.email,
      subject,
      html,
    });

    // Log activity
    await logActivity({
      hotel: booking.hotel,
      company,
      entityType: "communication",
      entityId: booking._id,
      action: "confirmation-sent",
      description: `Booking confirmation email sent to <strong>${booking.guest?.email || booking.guestInfo?.email}</strong>`,
      icon: "Mail",
      color: "#10b981",
      actor: userId,
      actorName: userName,
    });

    res.json({
      success: true,
      message: "Confirmation email sent",
      data: { emailSent: emailResult.success, recipient: booking.guest?.email || booking.guestInfo?.email },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Send check-in reminder
 */
export const sendCheckInReminder = async (req, res) => {
  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { bookingId } = req.body;

    if (!hotel) {
      return res.status(400).json({ success: false, message: "Hotel context required" });
    }

    // Query-scoped by hotel for security (prevent cross-hotel email sending)
    const booking = await Booking.findOne({
      _id: bookingId,
      hotel: hotel
    })
      .populate("room", "type")
      .populate("guest", "fullName email")
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found or access denied" });
    }

    const hotelData = await Hotel.findById(booking.hotel).lean();
    const template = emailTemplates.checkInReminder;
    const subject = template.subject.replace("{hotelName}", hotelData?.name || "Our Hotel");
    const html = template.buildHTML({
      guestName: booking.guest?.fullName || booking.guestInfo?.name || "Guest",
      hotelName: hotelData?.name || "Our Hotel",
      hotelAddress: hotelData?.address || "",
      hotelPhone: hotelData?.phone || "",
      checkInDate: new Date(booking.checkIn).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      bookingId: booking.bookingId,
      roomType: booking.room?.type || "Standard Room",
      mobileCheckinEnabled: true,
      mobileCheckinUrl: `${process.env.CLIENT_URL}/checkin/${booking._id}`,
      directionsUrl: `https://maps.google.com/?q=${encodeURIComponent(hotelData?.address || "")}`,
      contactUrl: `tel:${hotelData?.phone}`,
      manageUrl: `${process.env.CLIENT_URL}/bookings/${booking._id}`,
    });

    const emailResult = await sendEmail({
      from: process.env.SENDER_EMAIL,
      to: booking.guest?.email || booking.guestInfo?.email,
      subject,
      html,
    });

    await logActivity({
      hotel: booking.hotel,
      company,
      entityType: "communication",
      entityId: booking._id,
      action: "checkin-reminder-sent",
      description: `Check-in reminder sent to <strong>${booking.guest?.email}</strong>`,
      icon: "Bell",
      color: "#3b82f6",
      actor: userId,
      actorName: userName,
    });

    res.json({
      success: true,
      message: "Check-in reminder sent",
      data: { emailSent: emailResult.success },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Send check-out reminder
 */
export const sendCheckOutReminder = async (req, res) => {
  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { bookingId } = req.body;

    if (!hotel) {
      return res.status(400).json({ success: false, message: "Hotel context required" });
    }

    // Query-scoped by hotel for security (prevent cross-hotel email sending)
    const booking = await Booking.findOne({
      _id: bookingId,
      hotel: hotel
    })
      .populate("room", "roomNumber")
      .populate("guest", "fullName email")
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found or access denied" });
    }

    const hotelData = await Hotel.findById(booking.hotel).lean();
    const invoice = await Invoice.findOne({ booking: booking._id }).lean();

    const template = emailTemplates.checkOutReminder;
    const subject = template.subject.replace("{hotelName}", hotelData?.name || "Our Hotel");
    const html = template.buildHTML({
      guestName: booking.guest?.fullName || booking.guestInfo?.name || "Guest",
      hotelName: hotelData?.name || "Our Hotel",
      hotelAddress: hotelData?.address || "",
      hotelPhone: hotelData?.phone || "",
      hotelEmail: hotelData?.email || "",
      checkOutTime: "11:00 AM",
      roomNumber: booking.room?.roomNumber || "TBD",
      hasOutstandingBalance: invoice?.balance > 0,
      roomCharges: invoice?.charges?.room?.toFixed(2) || "0.00",
      extraCharges: invoice?.charges?.extras?.toFixed(2) || "0.00",
      taxes: invoice?.charges?.tax?.toFixed(2) || "0.00",
      totalDue: invoice?.balance?.toFixed(2) || "0.00",
      currency: booking.currency || "USD",
      paymentUrl: `${process.env.CLIENT_URL}/payment/${booking._id}`,
      reviewUrl: `${process.env.CLIENT_URL}/review/${booking._id}`,
    });

    const emailResult = await sendEmail({
      from: process.env.SENDER_EMAIL,
      to: booking.guest?.email || booking.guestInfo?.email,
      subject,
      html,
    });

    await logActivity({
      hotel: booking.hotel,
      company,
      entityType: "communication",
      entityId: booking._id,
      action: "checkout-reminder-sent",
      description: `Check-out reminder sent to <strong>${booking.guest?.email}</strong>`,
      icon: "LogOut",
      color: "#f59e0b",
      actor: userId,
      actorName: userName,
    });

    res.json({
      success: true,
      message: "Check-out reminder sent",
      data: { emailSent: emailResult.success },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Send custom email
 */
export const sendCustomEmail = async (req, res) => {
  try {
    const { hotel, company, userId, userName } = getCtx(req);
    const { to, subject, html, bookingId } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, message: "to, subject, and html are required" });
    }

    const emailResult = await sendEmail({
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      html,
    });

    await logActivity({
      hotel,
      company,
      entityType: "communication",
      entityId: bookingId || "custom",
      action: "custom-email-sent",
      description: `Custom email sent to <strong>${to}</strong>`,
      icon: "Send",
      color: "#8b5cf6",
      actor: userId,
      actorName: userName,
    });

    res.json({
      success: true,
      message: "Email sent",
      data: { emailSent: emailResult.success },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get available email templates
 */
export const getEmailTemplates = async (req, res) => {
  const templates = Object.keys(emailTemplates).map((key) => ({
    id: key,
    name: key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase()),
    subject: emailTemplates[key].subject,
  }));

  res.json({ success: true, data: templates });
};

/**
 * Preview email template
 */
export const previewEmailTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { bookingId } = req.query;

    const template = emailTemplates[templateId];
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    // Generate preview with sample data
    const sampleData = {
      guestName: "John Doe",
      hotelName: "Grand Hotel",
      hotelAddress: "123 Main Street, City, Country",
      hotelPhone: "+1 234 567 890",
      hotelEmail: "info@grandhotel.com",
      bookingId: "BK-123456",
      confirmationCode: "ABC123",
      roomType: "Deluxe King",
      roomNumber: "301",
      checkInDate: new Date().toLocaleDateString(),
      checkOutDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString(),
      checkOutTime: "11:00 AM",
      nights: 2,
      adults: 2,
      children: 0,
      totalAmount: "299.00",
      currency: "USD",
      roomCharges: "250.00",
      extraCharges: "30.00",
      taxes: "19.00",
      totalDue: "0.00",
      hasOutstandingBalance: false,
      specialRequests: "Late check-in requested",
      mobileCheckinEnabled: true,
      mobileCheckinUrl: "#",
      directionsUrl: "#",
      contactUrl: "#",
      manageUrl: "#",
      paymentUrl: "#",
      reviewUrl: "#",
      discountPercent: 20,
      promoCode: "COMEBACK20",
      expiryDate: "7 days",
      daysSinceStay: 30,
      bookingUrl: "#",
    };

    const html = template.buildHTML(sampleData);

    res.json({
      success: true,
      data: {
        subject: template.subject.replace("{hotelName}", "Grand Hotel"),
        html,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Schedule automated reminders
 */
export const scheduleAutomatedReminders = async (req, res) => {
  try {
    const { hotel, company } = getCtx(req);
    const { type, enabled, timing } = req.body;

    // This would save to a settings collection
    // For now, just return success
    res.json({
      success: true,
      message: "Reminder settings updated",
      data: { type, enabled, timing },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get communication history for a booking
 */
export const getCommunicationHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Get activity logs for this booking
    const communications = await ActivityLog.find({
      entityId: bookingId,
      action: { $in: ["confirmation-sent", "checkin-reminder-sent", "checkout-reminder-sent", "custom-email-sent"] },
    })
      .populate("actor", "fullname")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: communications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
