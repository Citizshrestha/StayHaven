# Changelog

> All notable changes to StayHaven will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- None

### Changed
- None

### Fixed
- None

---

## [1.0.0] - 2024-12-01

### Added
- **User Management**
  - User registration and login
  - JWT-based authentication (access + refresh tokens)
  - Google OAuth integration
  - Role-based access control (Guest, Hotel Staff, Admin)
  - Email verification
  - Password reset functionality

- **Hotel Management**
  - Hotel CRUD operations
  - Room management
  - Multi-tenancy support (company-based)
  - Hotel image uploads (Cloudinary)
  - Hotel search and filtering
  
- **Booking System**
  - Room booking flow
  - Date availability checking
  - Booking status management (pending, confirmed, cancelled)
  - Guest capacity validation
  
- **Order Management** (Hotel Restaurant)
  - Menu item management
  - Order creation and tracking
  - Kitchen Order Ticket (KOT) system
  - Order status workflow
  
- **Table Management**
  - Table assignment system
  - Waiter call functionality
  - Real-time table status
  
- **Real-time Features**
  - Socket.IO integration
  - Real-time order notifications
  - Waiter call notifications
  - Live order status updates
  
- **Notifications**
  - Email notifications (booking confirmations, password reset)
  - In-app notifications
  - Real-time push notifications via WebSocket
  
- **Staff Management**
  - Staff CRUD operations
  - Role assignment
  - Hotel-staff associations

### Technical
- **Backend**
  - Node.js 22.12.0
  - Express 5.1.0
  - MongoDB 6.20.0 with Mongoose 8.19.1
  - Socket.IO 4.8.3 for real-time communication
  - Cloudinary for image storage
  - Nodemailer for email service
  
- **Frontend**
  - React 19.2.1
  - Vite 7.1.12
  - Tailwind CSS 4.1.16
  - Socket.IO Client 4.8.3
  - Axios for API calls
  
- **Security**
  - JWT token authentication
  - Password hashing with bcrypt
  - CORS configuration
  - Input validation and sanitization
  - Rate limiting (planned)
  
- **DevOps**
  - Environment-based configuration
  - Structured logging
  - Error handling middleware
  - Database connection pooling

### Database Schema
- User schema with roles and authentication
- Company schema for multi-tenancy
- Hotel schema with location and amenities
- Room schema with pricing and capacity
- Booking schema with status tracking
- MenuItem schema for restaurant menu
- Order schema with line items
- TableAssignment schema
- WaiterCall schema
- Notification schema
- Role schema
- Loyalty schema (placeholder)

### API Endpoints
- **Auth**: `/api/auth/*` (register, login, refresh, verify-email, etc.)
- **Users**: `/api/users/*` (profile, update, delete)
- **Hotels**: `/api/hotels/*` (CRUD, search, filter)
- **Bookings**: `/api/bookings/*` (create, read, update, cancel)
- **Staff**: `/api/staff/*` (CRUD, assignments)
- **Company**: `/api/companies/*` (CRUD for multi-tenancy)

---

## [0.1.0] - 2024-10-01 (Beta)

### Added
- Initial project setup
- Basic authentication flow
- Hotel listing prototype
- Simple booking form

### Known Issues
- No email verification
- Limited error handling
- No real-time features

---

## Version Format

```
[MAJOR.MINOR.PATCH] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security patches
```

---

## Links

[Unreleased]: https://github.com/stayhaven/stayhaven/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/stayhaven/stayhaven/releases/tag/v1.0.0
[0.1.0]: https://github.com/stayhaven/stayhaven/releases/tag/v0.1.0