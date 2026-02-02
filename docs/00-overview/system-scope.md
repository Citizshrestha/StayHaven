# System Scope

> Defining what is included and excluded from the StayHaven platform

---

## ✅ In Scope (What We're Building)

### Core Features

#### 1. **Marketplace Module**
- ✅ Hotel listing and search
- ✅ Advanced filtering (location, price, amenities, rating)
- ✅ Hotel detail pages with images
- ✅ Room booking system
- ✅ Wishlist and cart functionality
- ✅ Guest reviews and ratings

#### 2. **Authentication & User Management**
- ✅ Email/password registration and login
- ✅ Google OAuth 2.0 integration
- ✅ OTP verification (signup and password reset)
- ✅ JWT-based authentication (access + refresh tokens)
- ✅ Role-based access control (RBAC)
- ✅ User profile management

#### 3. **Hotel Management System**
- ✅ Multi-property management
- ✅ Room inventory management
- ✅ Staff management (invite, roles, permissions)
- ✅ Company profile and branding
- ✅ Admin approval workflow for listings
- ✅ Hotel analytics dashboard

#### 4. **Order Management System**
- ✅ Menu item management
- ✅ Order creation (room service, dine-in, takeaway)
- ✅ Kitchen Order Ticket (KOT) system
- ✅ Bar Order Ticket (BOT) system
- ✅ Real-time order status tracking
- ✅ Auto-incrementing order numbers

#### 5. **Real-Time Communication**
- ✅ Socket.io WebSocket server
- ✅ Real-time order updates
- ✅ Waiter call notifications
- ✅ Service request alerts
- ✅ Multi-user synchronization

#### 6. **Staff Dashboards**
- ✅ Waiter dashboard
- ✅ Kitchen dashboard
- ✅ Reception dashboard
- ✅ Hotel admin dashboard
- ✅ Super admin dashboard

#### 7. **Technical Infrastructure**
- ✅ MongoDB database with multi-tenancy
- ✅ RESTful API design
- ✅ Cloudinary image storage
- ✅ Email notifications (Nodemailer)
- ✅ Error handling and logging
- ✅ CORS and security middleware

---

## ❌ Out of Scope (Not in Current Version)

### Phase 2 Features (Future)

#### Payment Processing
- ❌ Payment gateway integration (Stripe, PayPal)
- ❌ Invoice generation
- ❌ Refund management
- ❌ Multi-currency support
- ❌ Accounting integration

#### Advanced Analytics
- ❌ Revenue forecasting
- ❌ Occupancy predictions
- ❌ AI-powered insights
- ❌ Custom report builder
- ❌ Export to Excel/PDF

#### Mobile Applications
- ❌ iOS native app
- ❌ Android native app
- ❌ Guest mobile app
- ❌ Staff mobile app
- ❌ Offline mode

#### Channel Management
- ❌ OTA integration (Booking.com, Expedia)
- ❌ Rate parity management
- ❌ Inventory sync across channels
- ❌ Review aggregation

#### Advanced Guest Features
- ❌ Loyalty program with points
- ❌ Membership tiers
- ❌ Guest chat support
- ❌ Virtual concierge
- ❌ Smart room controls

#### Marketing Tools
- ❌ Email marketing campaigns
- ❌ SMS notifications
- ❌ Promotional codes
- ❌ Affiliate program
- ❌ Social media integration

---

## 🎯 MVP Scope (Current Release)

### Critical Path Features

**Must Have** for launch:
1. Hotel listing and booking
2. User authentication (email + Google)
3. Basic hotel management
4. Order management with real-time updates
5. Staff dashboards (waiter, kitchen, reception)
6. Admin approval system

**Nice to Have** but not critical:
- Advanced analytics
- Payment processing
- Mobile apps
- Loyalty programs

---

## 🔧 Technical Scope

### Technology Stack Decisions

#### Frontend
✅ **In Scope**:
- React 19.2.1 with hooks
- Vite build tool
- Tailwind CSS for styling
- React Router for navigation
- Context API for state management
- Axios for HTTP requests

❌ **Out of Scope**:
- TypeScript (may add later)
- Redux/MobX (using Context API)
- Server-side rendering (SSR)
- Progressive Web App (PWA)
- Micro-frontends

#### Backend
✅ **In Scope**:
- Node.js with Express.js 5.1.0
- MongoDB with Mongoose ODM
- JWT authentication
- Socket.io for real-time
- Cloudinary for image storage
- Nodemailer for emails

❌ **Out of Scope**:
- GraphQL API
- Message queue (Redis, RabbitMQ)
- Microservices architecture
- gRPC communication
- Kubernetes orchestration

#### DevOps
✅ **In Scope**:
- Environment variable configuration
- Basic error logging
- CORS configuration
- MongoDB Atlas hosting

❌ **Out of Scope**:
- Docker containerization
- CI/CD pipeline (GitHub Actions)
- Load balancing
- Auto-scaling
- Monitoring (New Relic, DataDog)
- Automated testing infrastructure

---

## 🌍 Geographic Scope

### Initial Launch Markets
✅ **In Scope**:
- Nepal
- India
- English language only

❌ **Out of Scope** (Phase 2):
- Global markets
- Multi-language support (i18n)
- Regional compliance (GDPR, PCI-DSS)
- Currency conversion

---

## 👥 User Role Scope

### Supported Roles (Current)
✅ **In Scope**:
1. **Guest** - Book hotels, order services
2. **Owner** - Manage properties and staff
3. **Admin** - Platform administration
4. **Manager** - Oversee hotel operations
5. **Receptionist** - Handle check-ins/bookings
6. **Waiter** - Take and serve orders
7. **Chief** - Kitchen operations

❌ **Out of Scope** (Future):
- Housekeeping staff
- Maintenance staff
- Accounting/Finance role
- Marketing role
- Custom role creation

---

## 📊 Data Scope

### Data We Store
✅ **In Scope**:
- User profiles and authentication
- Hotel and room information
- Bookings and reservations
- Orders and menu items
- Staff assignments
- Notifications
- Company profiles

❌ **Out of Scope**:
- Payment transaction history
- Credit card information (PCI compliance)
- Guest chat transcripts
- SMS logs
- Email marketing lists
- Third-party analytics data

---

## 🔒 Security Scope

### Security Features Implemented
✅ **In Scope**:
- Password hashing (bcrypt)
- JWT authentication
- CORS protection
- Role-based access control
- OTP verification
- HttpOnly cookies for refresh tokens

❌ **Out of Scope** (Phase 2):
- Two-factor authentication (2FA)
- IP whitelisting
- Rate limiting
- DDoS protection
- Penetration testing
- Security audit certification

---

## 🧪 Testing Scope

### Testing Strategy
✅ **In Scope**:
- Manual testing
- Postman API testing
- Basic error handling

❌ **Out of Scope** (Should Add):
- Unit tests (Jest)
- Integration tests
- E2E tests (Cypress)
- Load testing
- Security testing
- Automated regression testing

---

## 🔗 Integration Scope

### Third-Party Integrations
✅ **In Scope**:
- Google OAuth 2.0
- Cloudinary (image storage)
- MongoDB Atlas (database)
- Email service (Nodemailer)

❌ **Out of Scope**:
- Payment gateways (Stripe, PayPal)
- SMS providers (Twilio)
- OTA channels (Booking.com API)
- Accounting software (QuickBooks)
- CRM systems (Salesforce)
- Analytics (Google Analytics)

---

## 📱 Platform Scope

### Supported Platforms
✅ **In Scope**:
- Web browsers (Chrome, Firefox, Safari, Edge)
- Desktop (Windows, macOS, Linux)
- Responsive design (mobile web)

❌ **Out of Scope**:
- Native iOS app
- Native Android app
- Tablet-optimized UI
- Smart TV apps
- Wearable devices

---

## 🔗 Related Documents

- [Assumptions and Constraints](./assumptions-and-constraints.md)
- [Functional Requirements](../01-requirements/functional-requirements.md)
- [Non-Functional Requirements](../01-requirements/non-functional-requirements.md)

---

## 📅 Document Info

**Created**: February 2, 2026
**Last Updated**: February 2, 2026
**Version**: 1.0
**Status**: ✅ Complete
