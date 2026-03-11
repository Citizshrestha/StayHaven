# Background Jobs and Cron Tasks

> Guide to scheduled tasks, background job processing, and cron jobs in StayHaven

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Use Cases](#use-cases)
3. [Implementation Options](#implementation-options)
4. [Planned Background Jobs](#planned-background-jobs)
5. [Best Practices](#best-practices)

---

## 🔄 Overview

### What are Background Jobs?

Background jobs are tasks that run independently from the main request-response cycle:
- **Scheduled tasks** (cron jobs) run at specific intervals
- **Asynchronous jobs** process tasks without blocking HTTP requests
- **Event-driven jobs** trigger based on specific events

### Why Background Jobs?

1. **Performance**: Don't block HTTP requests
2. **Reliability**: Retry failed operations
3. **Scheduling**: Run tasks at optimal times
4. **Scalability**: Distribute workload across workers

---

## 🎯 Use Cases

### Current Status

StayHaven currently **does not implement** background jobs, but the following use cases are planned for future implementation:

### 1. Order Management

- **Auto-cancel pending orders** older than 30 minutes
- **Send order reminders** to kitchen after 15 minutes
- **Clean up old delivered orders** older than 90 days

### 2. Booking Management

- **Send booking reminders** 24 hours before check-in
- **Auto-cancel unpaid bookings** after 24 hours
- **Update room availability** based on check-in/check-out times
- **Send check-out reminders** on checkout day

### 3. Notifications

- **Send daily digest emails** to hotel managers
- **Push notifications** for upcoming bookings
- **SMS reminders** for guests

### 4. Loyalty Program

- **Calculate loyalty points** monthly
- **Expire unused loyalty points** after 12 months
- **Send tier upgrade notifications**

### 5. Data Maintenance

- **Database backup** daily at 2 AM
- **Log cleanup** weekly (delete logs older than 30 days)
- **Image optimization** compress uploaded images
- **Generate analytics reports** weekly

### 6. Email Campaigns

- **Send promotional emails** to subscribed users
- **Birthday greetings** to guests
- **Inactive user re-engagement** after 60 days

---

## 🛠️ Implementation Options

### Option 1: node-cron (Recommended)

**Install**:
```bash
npm install node-cron
```

**Example Implementation**:
```javascript
// utils/cronJobs.js
import cron from 'node-cron';
import { Order } from '../models/order.schema.js';
import { Booking } from '../models/booking.schema.js';

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('Running: Auto-cancel pending orders');
  
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  const result = await Order.updateMany(
    {
      status: 'pending',
      createdAt: { $lt: thirtyMinutesAgo }
    },
    { status: 'cancelled' }
  );
  
  console.log(`Cancelled ${result.modifiedCount} orders`);
});

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running: Send booking reminders');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const bookings = await Booking.find({
    checkIn: {
      $gte: tomorrow,
      $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
    },
    status: 'Confirmed'
  }).populate('user', 'email fullname');
  
  // Send reminder emails
  for (const booking of bookings) {
    // await sendReminderEmail(booking.user.email, booking);
    console.log(`Reminder sent to ${booking.user.email}`);
  }
});

// Run weekly on Sunday at 3:00 AM
cron.schedule('0 3 * * 0', async () => {
  console.log('Running: Clean up old orders');
  
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  const result = await Order.deleteMany({
    status: 'delivered',
    createdAt: { $lt: ninetyDaysAgo }
  });
  
  console.log(`Deleted ${result.deletedCount} old orders`);
});

export default cron;
```

**Cron Schedule Patterns**:
```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─ Day of week (0-7, 0 or 7 is Sunday)
│ │ │ │ └─── Month (1-12)
│ │ │ └───── Day of month (1-31)
│ │ └─────── Hour (0-23)
│ └───────── Minute (0-59)
└─────────── Second (optional)

// Every 5 minutes
'*/5 * * * *'

// Every hour at minute 30
'30 * * * *'

// Every day at 2:30 AM
'30 2 * * *'

// Every Monday at 9:00 AM
'0 9 * * 1'

// First day of month at midnight
'0 0 1 * *'
```

### Option 2: Bull (Queue-based)

**Install**:
```bash
npm install bull redis
```

**Example**:
```javascript
// utils/queues/orderQueue.js
import Queue from 'bull';

const orderQueue = new Queue('orderProcessing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Add job to queue
orderQueue.add('cancel-old-orders', {}, {
  repeat: { cron: '*/30 * * * *' }
});

// Process job
orderQueue.process('cancel-old-orders', async (job) => {
  console.log('Processing: Cancel old orders');
  
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  const result = await Order.updateMany(
    { status: 'pending', createdAt: { $lt: thirtyMinutesAgo } },
    { status: 'cancelled' }
  );
  
  return { cancelledCount: result.modifiedCount };
});

export default orderQueue;
```

### Option 3: Agenda (MongoDB-based)

**Install**:
```bash
npm install agenda
```

**Example**:
```javascript
// utils/agenda.js
import Agenda from 'agenda';

const agenda = new Agenda({
  db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' }
});

// Define job
agenda.define('cancel-old-orders', async (job) => {
  console.log('Running: Cancel old orders');
  
  const result = await Order.updateMany(
    {
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }
    },
    { status: 'cancelled' }
  );
  
  console.log(`Cancelled ${result.modifiedCount} orders`);
});

// Schedule job
await agenda.start();
await agenda.every('30 minutes', 'cancel-old-orders');

export default agenda;
```

---

## 📝 Planned Background Jobs

### Job 1: Auto-Cancel Old Orders

```javascript
// jobs/cancelOldOrders.js
import { Order } from '../models/order.schema.js';
import { getIO } from '../config/socket.js';

export const cancelOldOrders = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  const orders = await Order.find({
    status: 'pending',
    createdAt: { $lt: thirtyMinutesAgo }
  });
  
  for (const order of orders) {
    order.status = 'cancelled';
    await order.save();
    
    // Notify via Socket.IO
    const io = getIO();
    io.to(`hotel-${order.hotel}`).emit('order-cancelled', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason: 'Auto-cancelled due to timeout'
    });
  }
  
  console.log(`Auto-cancelled ${orders.length} orders`);
};
```

### Job 2: Send Booking Reminders

```javascript
// jobs/sendBookingReminders.js
import { Booking } from '../models/booking.schema.js';
import createTransporter from '../config/nodemailer.js';

export const sendBookingReminders = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const tomorrowEnd = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
  
  const bookings = await Booking.find({
    checkIn: { $gte: tomorrow, $lt: tomorrowEnd },
    status: 'Confirmed'
  })
    .populate('user', 'email fullname')
    .populate('hotel', 'name contact');
  
  const transporter = await createTransporter();
  
  for (const booking of bookings) {
    const mailOptions = {
      from: process.env.MAIL_FROM,
      to: booking.user.email,
      subject: 'Booking Reminder - Check-in Tomorrow',
      html: `
        <h2>Hello ${booking.user.fullname},</h2>
        <p>This is a reminder that your check-in is tomorrow at ${booking.hotel.name}.</p>
        <p><strong>Check-in Date:</strong> ${booking.checkIn.toLocaleDateString()}</p>
        <p><strong>Confirmation Code:</strong> ${booking.confirmationCode}</p>
        <p>Looking forward to your arrival!</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Reminder sent to ${booking.user.email}`);
  }
};
```

### Job 3: Calculate Loyalty Points

```javascript
// jobs/calculateLoyaltyPoints.js
import { Loyalty } from '../models/loyalty.schema.js';
import { Booking } from '../models/booking.schema.js';

export const calculateLoyaltyPoints = async () => {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(1);
  lastMonth.setHours(0, 0, 0, 0);
  
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  
  // Get completed bookings from last month
  const bookings = await Booking.find({
    status: 'Checked-Out',
    checkOut: { $gte: lastMonth, $lt: thisMonth }
  });
  
  for (const booking of bookings) {
    // 1 point per dollar spent
    const points = Math.floor(booking.totalAmount);
    
    await Loyalty.findOneAndUpdate(
      { user: booking.user },
      {
        $inc: { totalPoints: points, currentPoints: points },
        $push: {
          history: {
            type: 'earn',
            points: points,
            description: `Earned from booking ${booking.confirmationCode}`,
            date: new Date()
          }
        }
      },
      { upsert: true }
    );
  }
  
  console.log(`Loyalty points calculated for ${bookings.length} bookings`);
};
```

### Job 4: Database Backup

```javascript
// jobs/backupDatabase.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const backupDatabase = async () => {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupPath = `./backups/backup-${timestamp}`;
  
  try {
    await execAsync(
      `mongodump --uri="${process.env.MONGODB_URI}" --out="${backupPath}"`
    );
    
    console.log(`Database backup created: ${backupPath}`);
  } catch (error) {
    console.error('Backup failed:', error);
  }
};
```

---

## ✅ Best Practices

### 1. **Error Handling**

```javascript
cron.schedule('*/30 * * * *', async () => {
  try {
    await cancelOldOrders();
  } catch (error) {
    console.error('Cron job error:', error);
    // Send alert to admin
  }
});
```

### 2. **Logging**

```javascript
const logJobExecution = (jobName, result) => {
  console.log({
    job: jobName,
    executedAt: new Date(),
    result: result,
    status: 'success'
  });
};
```

### 3. **Timezone Awareness**

```javascript
// Specify timezone
cron.schedule('0 2 * * *', async () => {
  // Runs at 2:00 AM Nepal time
}, {
  timezone: "Asia/Kathmandu"
});
```

### 4. **Graceful Shutdown**

```javascript
process.on('SIGTERM', () => {
  console.log('Stopping cron jobs...');
  cron.getTasks().forEach(task => task.stop());
  process.exit(0);
});
```

### 5. **Idempotency**

```javascript
// Ensure jobs can run multiple times safely
export const processJob = async () => {
  // Use unique identifiers to prevent duplicate processing
  const processed = await Job.findOne({ 
    status: 'completed', 
    executedAt: { $gte: startOfDay } 
  });
  
  if (processed) {
    console.log('Job already processed today');
    return;
  }
  
  // Process job...
};
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Service Layer Design](./service-layer-design.md)
- [Environment Configuration](./environment-configuration.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Background jobs and cron tasks guide (Planned features)
