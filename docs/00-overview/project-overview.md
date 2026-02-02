# Project Overview

> **StayHaven** - A comprehensive two-sided marketplace platform connecting hotel owners with guests, featuring integrated hotel management and real-time order management systems.

---

## 🎯 Project Summary

**StayHaven** is a full-stack web application built using the MERN stack (MongoDB, Express.js, React, Node.js) that serves as a complete hotel booking and management ecosystem.

### Platform Type
**Two-Sided Marketplace** with integrated property management capabilities

### Technology Stack
- **Frontend**: React 19.2.1 with Vite, Tailwind CSS
- **Backend**: Node.js with Express.js 5.1.0
- **Database**: MongoDB 6.20.0 with Mongoose ODM
- **Real-time**: Socket.io 4.8.3
- **Authentication**: JWT + Google OAuth 2.0
- **Cloud Storage**: Cloudinary
- **Email Service**: Nodemailer

---

## 🌟 What Makes StayHaven Unique?

### 1. **Dual-Purpose Platform**
- **Marketplace**: Hotel owners list properties, guests book rooms
- **Management System**: Complete hotel operations (staff, orders, room service)

### 2. **Real-Time Operations**
- Live order updates from kitchen to waiters
- Instant service call notifications
- Real-time booking status updates
- WebSocket-based communication

### 3. **Multi-Tenancy Architecture**
- Multiple hotels under single company management
- Property-level data isolation
- Role-based access per property
- Scalable organizational structure

### 4. **Integrated Order Management**
- Kitchen Order Ticket (KOT) system
- Bar Order Ticket (BOT) system
- Room service ordering
- Dine-in and takeaway support

---

## 👥 Target Audience

### Primary Users

1. **Hotel Owners**
   - List and manage multiple properties
   - Track bookings and revenue
   - Manage staff and operations

2. **Guests**
   - Search and book hotels
   - Order in-room services
   - Manage reservations

3. **Hotel Staff**
   - **Receptionists**: Check-ins, bookings
   - **Waiters**: Take orders, serve guests
   - **Kitchen Staff**: Prepare orders
   - **Managers**: Oversee operations

4. **Platform Administrators**
   - Approve hotel listings
   - Manage platform users
   - Feature hotels on homepage
   - Monitor system health

---

## 🎯 Core Capabilities

### For Hotel Owners
✅ Multi-property management
✅ Staff invitation and role assignment
✅ Revenue and booking analytics
✅ Room inventory management
✅ Menu and pricing control
✅ Real-time occupancy tracking

### For Guests
✅ Advanced hotel search and filtering
✅ Detailed property information
✅ Secure booking system
✅ In-room service ordering
✅ Waiter call functionality
✅ Wishlist and cart features

### For Staff
✅ Role-based dashboards
✅ Real-time order notifications
✅ Table and room assignments
✅ Service request management
✅ Multi-property access (if assigned)

### For Admins
✅ Hotel approval workflow
✅ User management
✅ Featured listings control
✅ Platform-wide analytics

---

## 🏗️ High-Level Architecture

```
┌─────────────────┐
│   React SPA     │  (Frontend - Port 5173)
│   Vite + React  │
└────────┬────────┘
         │ HTTP/HTTPS + WebSocket
         │
┌────────▼────────┐
│   Express API   │  (Backend - Port 3000)
│   Node.js       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│MongoDB│ │Socket.io│
│Atlas  │ │Server   │
└───────┘ └─────────┘
```

---

## 📊 Key Metrics

### System Capacity (Design Goals)
- **Hotels**: Support for 1,000+ properties
- **Users**: 100,000+ registered users
- **Concurrent Orders**: 500+ simultaneous orders
- **WebSocket Connections**: 1,000+ live connections

### Performance Targets
- **API Response Time**: < 200ms (95th percentile)
- **Page Load Time**: < 2 seconds
- **Real-time Latency**: < 100ms for Socket.io events
- **Database Query Time**: < 50ms (indexed queries)

---

## 🚀 Project Timeline

### Current Status: **Production-Ready MVP**

**Phase 1**: Core Marketplace (Completed)
- Hotel listing and booking
- User authentication
- Basic search and filtering

**Phase 2**: Hotel Management (Completed)
- Staff management
- Order management
- Real-time notifications

**Phase 3**: Advanced Features (In Progress)
- Payment integration
- Advanced analytics
- Mobile app development

---

## 🔗 Related Documents

- [Problem Statement](./problem-statement.md) - Why StayHaven exists
- [Business Objectives](./business-objectives.md) - Goals and KPIs
- [System Scope](./system-scope.md) - What's included and excluded
- [Target Users and Personas](./target-users-and-personas.md) - Detailed user profiles

---

## 📅 Document Info

**Created**: February 2, 2026
**Last Updated**: February 2, 2026
**Version**: 1.0
**Status**: ✅ Complete
