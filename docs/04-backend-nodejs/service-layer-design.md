# Service Layer Design

> Guide to service layer architecture, business logic encapsulation, and reusable services in StayHaven

---

## 📋 Table of Contents

1. [Service Layer Overview](#service-layer-overview)
2. [Current Implementation](#current-implementation)
3. [Service Examples](#service-examples)
4. [Utility Functions](#utility-functions)
5. [Best Practices](#best-practices)

---

## 🏗️ Service Layer Overview

### What is a Service Layer?

The service layer sits between controllers and models, encapsulating:
- **Business logic** that spans multiple models
- **Reusable operations** used across controllers
- **Third-party integrations** (email, cloud storage, payments)
- **Complex calculations** and data transformations

### Architecture

```
┌─────────────────────────────────────┐
│         Controller Layer            │
│  ├─ Request validation              │
│  ├─ Call service functions          │
│  └─ Send HTTP response              │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Service Layer (Planned)     │
│  ├─ Business logic                  │
│  ├─ Data manipulation               │
│  ├─ Third-party integrations        │
│  └─ Reusable operations             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Model Layer                 │
│  ├─ Database operations             │
│  ├─ Schema validation               │
│  └─ Data persistence                │
└─────────────────────────────────────┘
```

---

## 📊 Current Implementation

### Status

StayHaven currently **does not implement a dedicated service layer**. Business logic is primarily in:
- **Controllers**: Handle request validation and response
- **Models**: Define schema and database operations
- **Utility functions**: Provide helper functions

### Existing Utilities

#### 1. asyncHandler

**File**: `utils/asyncHandler.js`

```javascript
/**
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

**Usage**:
```javascript
import { asyncHandler } from '../utils/asyncHandler.js';

export const getHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find();
  res.json({ success: true, hotels });
});
```

#### 2. Token Utilities

**File**: `utils/tokenUtils.js`

```javascript
import jwt from 'jsonwebtoken';

/**
 * Generate JWT access token (1 hour)
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '1h' }
  );
};

/**
 * Generate JWT refresh token (7 days)
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @param {string} secret - JWT secret
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};
```

#### 3. Password Validation

**File**: `utils/passwordValidation.js`

```javascript
/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result
 */
export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

---

## 💡 Service Examples

### Proposed Service Structure

```
services/
├── emailService.js       # Email sending operations
├── cloudinaryService.js  # Image upload/delete
├── orderService.js       # Order business logic
├── bookingService.js     # Booking calculations
├── loyaltyService.js     # Loyalty points management
├── notificationService.js # Push notifications
└── paymentService.js     # Payment processing (future)
```

### Email Service

**File**: `services/emailService.js`

```javascript
import createTransporter from '../config/nodemailer.js';

/**
 * Send welcome email to new user
 */
export const sendWelcomeEmail = async (user) => {
  const transporter = await createTransporter();

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: user.email,
    subject: 'Welcome to StayHaven',
    html: `
      <h2>Welcome ${user.fullname}!</h2>
      <p>Thank you for joining StayHaven.</p>
      <p>Start exploring amazing hotels and make your first booking.</p>
      <a href="${process.env.FRONTEND_URL}">Browse Hotels</a>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send password reset OTP email
 */
export const sendResetPasswordEmail = async (user, otp) => {
  const transporter = await createTransporter();

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: user.email,
    subject: 'Password Reset OTP',
    html: `
      <h2>Password Reset Request</h2>
      <p>Your OTP for password reset is:</p>
      <h1 style="color: #4F46E5;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (order, user) => {
  const transporter = await createTransporter();

  const itemsHTML = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${item.price}</td>
      <td>$${item.quantity * item.price}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: user.email,
    subject: `Order Confirmation - #${order.orderNumber}`,
    html: `
      <h2>Order Confirmed</h2>
      <p>Hello ${user.fullname},</p>
      <p>Your order #${order.orderNumber} has been confirmed.</p>
      
      <table border="1" cellpadding="10">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>$${order.totalPrice}</strong></td>
          </tr>
        </tfoot>
      </table>
      
      <p>Estimated delivery: 30-45 minutes</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send booking confirmation email
 */
export const sendBookingConfirmationEmail = async (booking, user, hotel) => {
  const transporter = await createTransporter();

  const mailOptions = {
    from: process.env.MAIL_FROM,
    to: user.email,
    subject: `Booking Confirmation - ${hotel.name}`,
    html: `
      <h2>Booking Confirmed</h2>
      <p>Hello ${user.fullname},</p>
      <p>Your booking at ${hotel.name} has been confirmed.</p>
      
      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Confirmation Code:</strong> ${booking.confirmationCode}</li>
        <li><strong>Check-in:</strong> ${booking.checkIn.toLocaleDateString()}</li>
        <li><strong>Check-out:</strong> ${booking.checkOut.toLocaleDateString()}</li>
        <li><strong>Guests:</strong> ${booking.guests.adults} adults, ${booking.guests.children} children</li>
        <li><strong>Total Amount:</strong> $${booking.totalAmount}</li>
      </ul>
      
      <h3>Hotel Contact:</h3>
      <p>Phone: ${hotel.contact.phone}</p>
      <p>Email: ${hotel.contact.email}</p>
      
      <p>Looking forward to your arrival!</p>
    `
  };

  await transporter.sendMail(mailOptions);
};
```

### Cloudinary Service

**File**: `services/cloudinaryService.js`

```javascript
import { v2 as cloudinary } from 'cloudinary';

/**
 * Upload single image to Cloudinary
 */
export const uploadImage = async (fileBuffer, folder = 'stayhaven') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload multiple images
 */
export const uploadMultipleImages = async (files, folder = 'stayhaven') => {
  const uploadPromises = files.map(file => uploadImage(file.buffer, folder));
  return await Promise.all(uploadPromises);
};

/**
 * Delete image from Cloudinary
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Delete multiple images
 */
export const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw error;
  }
};
```

### Order Service

**File**: `services/orderService.js`

```javascript
import { Order } from '../models/order.schema.js';
import { MenuItem } from '../models/menuItem.schema.js';
import { getIO } from '../config/socket.js';

/**
 * Calculate order total with validation
 */
export const calculateOrderTotal = async (items) => {
  let total = 0;
  const validatedItems = [];

  for (const item of items) {
    if (item.menuItem) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        throw new Error(`Menu item ${item.menuItem} not found`);
      }
      if (!menuItem.isAvailable) {
        throw new Error(`${menuItem.name} is not available`);
      }
      
      validatedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        subtotal: menuItem.price * item.quantity
      });
      
      total += menuItem.price * item.quantity;
    }
  }

  return { total, validatedItems };
};

/**
 * Create order with notifications
 */
export const createOrderWithNotification = async (orderData, userId) => {
  const { total, validatedItems } = await calculateOrderTotal(orderData.items);

  const order = await Order.create({
    ...orderData,
    items: validatedItems,
    totalPrice: total,
    orderBy: userId,
    status: 'pending'
  });

  // Emit to kitchen
  const io = getIO();
  io.to(`hotel-${order.hotel}-chiefs`).emit('new-order', {
    order,
    message: `New order #${order.orderNumber} received`,
    timestamp: new Date()
  });

  return order;
};

/**
 * Update order status with notifications
 */
export const updateOrderStatusWithNotification = async (orderId, newStatus) => {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { status: newStatus },
    { new: true }
  );

  if (!order) {
    throw new Error('Order not found');
  }

  const io = getIO();

  if (newStatus === 'ready') {
    // Notify waiters
    io.to(`hotel-${order.hotel}-waiters`).emit('order-ready', {
      order,
      message: `Order #${order.orderNumber} is ready`,
      timestamp: new Date()
    });
  }

  if (newStatus === 'delivered') {
    // Notify guest
    order.deliveredAt = new Date();
    await order.save();
    
    io.to(`user-${order.orderBy}`).emit('order-delivered', {
      order,
      message: `Your order #${order.orderNumber} has been delivered`,
      timestamp: new Date()
    });
  }

  return order;
};
```

### Booking Service

**File**: `services/bookingService.js`

```javascript
import { Booking } from '../models/booking.schema.js';
import { Room } from '../models/room.schema.js';

/**
 * Calculate total nights
 */
export const calculateNights = (checkIn, checkOut) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((checkOut - checkIn) / oneDay));
};

/**
 * Calculate booking total
 */
export const calculateBookingTotal = async (roomId, checkIn, checkOut) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new Error('Room not found');
  }

  const nights = calculateNights(checkIn, checkOut);
  const total = room.price * nights;

  return { nights, pricePerNight: room.price, total };
};

/**
 * Check room availability
 */
export const checkRoomAvailability = async (roomId, checkIn, checkOut) => {
  const conflictingBookings = await Booking.find({
    room: roomId,
    status: { $in: ['Confirmed', 'Checked-In'] },
    $or: [
      {
        checkIn: { $lte: checkOut },
        checkOut: { $gte: checkIn }
      }
    ]
  });

  return conflictingBookings.length === 0;
};

/**
 * Generate unique confirmation code
 */
export const generateConfirmationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
```

---

## ✅ Best Practices

### 1. **Keep Services Pure**

```javascript
// Good - Pure function
export const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// Avoid - Side effects in service
export const calculateTotal = (items) => {
  console.log('Calculating...'); // Side effect
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};
```

### 2. **Single Responsibility**

```javascript
// Good - Each function does one thing
export const validateEmail = (email) => { /* ... */ };
export const sendEmail = (to, subject, body) => { /* ... */ };

// Avoid - Function doing too much
export const validateAndSendEmail = (email, subject, body) => { /* ... */ };
```

### 3. **Error Handling**

```javascript
export const createOrder = async (orderData) => {
  try {
    const order = await Order.create(orderData);
    return order;
  } catch (error) {
    if (error.name === 'ValidationError') {
      throw new Error('Invalid order data');
    }
    throw error;
  }
};
```

### 4. **Return Consistent Data**

```javascript
// Good - Always return same structure
export const getOrderStats = async (hotelId) => {
  const stats = await Order.aggregate(/* ... */);
  return {
    success: true,
    data: stats
  };
};
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Controller Design Pattern](./controller-design-pattern.md)
- [Background Jobs and Cron](./background-jobs-and-cron.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Service layer design guide (Planned features)
