# 🏨 StayHaven

> A comprehensive hotel booking and management platform built with MERN stack

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22.12.0-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.2.1-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.20.0-green.svg)](https://www.mongodb.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**StayHaven** is a modern, full-stack hotel booking and management platform that serves as a two-sided marketplace connecting travelers with hotels while providing comprehensive hotel management tools. The platform includes real-time features for order management, staff coordination, and guest communication.

### Key Highlights

- 🔐 **Secure Authentication** - JWT-based auth with Google OAuth integration
- 🏨 **Multi-tenancy** - Company-based hotel management
- 📱 **Real-time Updates** - Socket.IO for live notifications and order tracking
- 🍽️ **Restaurant Management** - Integrated POS and KOT system
- 📊 **Analytics Dashboard** - Comprehensive booking and revenue insights
- 🌐 **Responsive Design** - Mobile-first approach with Tailwind CSS

---

## ✨ Features

### For Guests

- 🔍 **Hotel Search & Discovery** - Filter by location, price, rating, amenities
- 📅 **Smart Booking System** - Real-time availability checking
- 👤 **User Profiles** - Manage bookings and preferences
- 🔔 **Notifications** - Email and real-time booking updates
- ⭐ **Reviews & Ratings** - Share experiences (Coming soon)
- 🎁 **Loyalty Program** - Earn and redeem points (Planned)

### For Hotel Staff

- 🏨 **Hotel Management** - Complete CRUD for hotels and rooms
- 📋 **Booking Management** - Track reservations and check-ins
- 🍽️ **Restaurant POS** - Menu management and order processing
- 📱 **Kitchen Display** - Real-time KOT (Kitchen Order Ticket) system
- 🔔 **Waiter Calls** - Table management and service requests
- 👥 **Staff Management** - Role-based access control
- 📊 **Analytics** - Occupancy rates and revenue tracking

### For Administrators

- 🏢 **Company Management** - Multi-property oversight
- 👨‍💼 **Staff Administration** - User and role management
- 📈 **System Analytics** - Platform-wide insights
- ⚙️ **System Configuration** - Platform settings and controls

---

## 🛠️ Tech Stack

### Backend

- **Runtime:** Node.js 22.12.0
- **Framework:** Express 5.1.0
- **Database:** MongoDB 6.20.0 with Mongoose 8.19.1
- **Authentication:** JWT (jsonwebtoken 9.0.2) + Google OAuth
- **Real-time:** Socket.IO 4.8.3
- **File Storage:** Cloudinary 2.8.0
- **Email:** Nodemailer 7.0.9
- **Validation:** Custom middleware with bcryptjs
- **API Design:** RESTful with JSON

### Frontend

- **Library:** React 19.2.1
- **Build Tool:** Vite 7.1.12
- **Routing:** React Router DOM 7.9.6
- **Styling:** Tailwind CSS 4.1.16
- **HTTP Client:** Axios 1.12.2
- **Real-time:** Socket.IO Client 4.8.3
- **UI Components:** Lucide React, React Icons
- **Notifications:** React Toastify 11.0.5
- **OAuth:** @react-oauth/google 0.12.2

### Development Tools

- **Version Control:** Git & GitHub
- **API Testing:** Postman
- **Linting:** ESLint
- **Process Manager:** Nodemon (dev), PM2 (production)
- **Containerization:** Docker (planned)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │   Mobile     │  │   Tablet     │      │
│  │   (React)    │  │   (Planned)  │  │   (React)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │     Load Balancer / Nginx (Prod)    │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │         Application Layer           │
          │  ┌────────────────────────────┐     │
          │  │   Express.js Server        │     │
          │  │   - REST API               │     │
          │  │   - Authentication         │     │
          │  │   - Business Logic         │     │
          │  │   - Socket.IO Server       │     │
          │  └────────────┬───────────────┘     │
          └───────────────┼─────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
    ┌─────▼──────┐              ┌────────▼────────┐
    │  MongoDB   │              │   Cloudinary    │
    │  Database  │              │  Image Storage  │
    │  - Hotels  │              │  - Hotel Pics   │
    │  - Bookings│              │  - User Photos  │
    │  - Users   │              └─────────────────┘
    │  - Orders  │
    └────────────┘
```

### Design Patterns

- **MVC Pattern** - Separation of concerns
- **Repository Pattern** - Data access abstraction
- **Middleware Pattern** - Request/response processing
- **Observer Pattern** - Real-time event handling
- **Factory Pattern** - Object creation (test data)

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0.0
- npm or yarn
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/StayHaven.git
cd StayHaven
```

1. **Backend Setup**

```bash
cd Backend
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
nano .env
```

**Backend Environment Variables:**

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stayhaven
JWT_ACCESS_SECRET=your_access_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

1. **Frontend Setup**

```bash
cd ../frontend
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
nano .env
```

**Frontend Environment Variables:**

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

1. **Start Development Servers**

**Backend:**

```bash
cd Backend
npm run dev
# Server runs on http://localhost:5000
```

**Frontend:**

```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

1. **Access the Application**

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:5000>
- API Health Check: <http://localhost:5000/health>

---

## 📁 Project Structure

```
StayHaven/
├── Backend/                    # Node.js backend
│   ├── config/                # Configuration files
│   │   ├── cloudinary.js     # Cloudinary setup
│   │   ├── db.js             # MongoDB connection
│   │   ├── nodemailer.js     # Email configuration
│   │   └── socket.js         # Socket.IO setup
│   ├── controllers/           # Request handlers
│   │   ├── authController.js
│   │   ├── hotelController.js
│   │   ├── bookingController.js
│   │   ├── orderController.js
│   │   └── ...
│   ├── middleware/            # Custom middleware
│   │   ├── authMiddleware.js
│   │   ├── isAuthenticated.js
│   │   └── upload.js
│   ├── models/                # Mongoose schemas
│   │   ├── user.schema.js
│   │   ├── hotel.schema.js
│   │   ├── booking.schema.js
│   │   └── ...
│   ├── routes/                # API routes
│   │   ├── authRoutes.js
│   │   ├── hotelRoutes.js
│   │   ├── userRoutes.js
│   │   └── ...
│   ├── utils/                 # Utility functions
│   │   ├── asyncHandler.js
│   │   ├── tokenUtils.js
│   │   └── ...
│   ├── server.js              # Entry point
│   └── package.json
│
├── frontend/                   # React frontend
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom hooks
│   │   ├── context/           # React context
│   │   ├── utils/             # Utility functions
│   │   ├── api/               # API client
│   │   ├── App.jsx            # Root component
│   │   └── main.jsx           # Entry point
│   ├── vite.config.js         # Vite configuration
│   └── package.json
│
├── docs/                       # Documentation
│   ├── 00-overview/           # Project overview
│   ├── 01-requirements/       # Requirements docs
│   ├── 02-architecture/       # Architecture docs
│   ├── 03-api/                # API documentation
│   ├── 04-backend-nodejs/     # Backend docs
│   ├── 05-security/           # Security docs
│   ├── 06-database/           # Database docs
│   ├── 07-exception-logging/  # Logging docs
│   ├── 08-testing/            # Testing docs
│   ├── 09-devops/             # DevOps docs
│   ├── 10-performance/        # Performance docs
│   ├── 11-maintenance/        # Maintenance docs
│   └── README.md              # Docs navigation
│
└── README.md                   # This file
```

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

### Core Documentation

- **[Project Overview](./docs/00-overview/project-overview.md)** - Platform vision and goals
- **[System Architecture](./docs/02-architecture/system-architecture-overview.md)** - Technical architecture
- **[API Documentation](./docs/03-api/api-overview.md)** - Complete API reference
- **[Database Schema](./docs/06-database/entity-relationship-model.md)** - Data models

### Development Guides

- **[Backend Guide](./docs/04-backend-nodejs/backend-overview.md)** - Backend development
- **[Security Guide](./docs/05-security/security-overview.md)** - Security best practices
- **[Testing Strategy](./docs/08-testing/testing-strategy.md)** - Testing approach

### Operations

- **[DevOps Guide](./docs/09-devops/ci-cd-pipeline.md)** - CI/CD and deployment
- **[Performance Guide](./docs/10-performance/performance-goals.md)** - Optimization strategies
- **[Maintenance Guide](./docs/11-maintenance/versioning-strategy.md)** - Version management

---

## 🔌 API Endpoints

### Authentication

```
POST   /api/auth/register           # Register new user
POST   /api/auth/login              # Login user
POST   /api/auth/google             # Google OAuth login
POST   /api/auth/refresh-token      # Refresh access token
POST   /api/auth/logout             # Logout user
POST   /api/auth/forgot-password    # Request password reset
POST   /api/auth/reset-password     # Reset password
GET    /api/auth/verify-email       # Verify email address
```

### Users

```
GET    /api/users/profile           # Get user profile
PUT    /api/users/profile           # Update profile
DELETE /api/users/profile           # Delete account
GET    /api/users/:id               # Get user by ID (admin)
```

### Hotels

```
GET    /api/hotels                  # List all hotels
GET    /api/hotels/:id              # Get hotel details
POST   /api/hotels                  # Create hotel (staff)
PUT    /api/hotels/:id              # Update hotel (staff)
DELETE /api/hotels/:id              # Delete hotel (admin)
GET    /api/hotels/search           # Search hotels
```

### Bookings

```
GET    /api/bookings                # List user bookings
GET    /api/bookings/:id            # Get booking details
POST   /api/bookings                # Create booking
PUT    /api/bookings/:id            # Update booking
DELETE /api/bookings/:id            # Cancel booking
```

### Orders (Restaurant)

```
GET    /api/orders                  # List orders
POST   /api/orders                  # Create order
PUT    /api/orders/:id              # Update order status
GET    /api/orders/kot              # Get KOT items
```

### Staff

```
GET    /api/staff                   # List staff (admin)
POST   /api/staff                   # Create staff (admin)
PUT    /api/staff/:id               # Update staff (admin)
DELETE /api/staff/:id               # Delete staff (admin)
```

**Full API documentation:** [API Reference](./docs/03-api/api-overview.md)

---

## 🧪 Testing

### Running Tests

**Backend Tests:**

```bash
cd Backend
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:coverage      # With coverage report
```

**Frontend Tests:**

```bash
cd frontend
npm test                   # Run all tests
npm run test:coverage      # With coverage
npm run test:e2e          # E2E tests (Cypress)
```

### Test Structure

```
Backend/tests/
├── unit/                  # Unit tests
│   ├── controllers/
│   ├── models/
│   └── utils/
├── integration/           # Integration tests
│   ├── api/
│   └── database/
└── fixtures/              # Test data

frontend/src/
├── __tests__/            # Component tests
├── components/
│   └── __tests__/
└── e2e/                  # E2E tests
```

### Coverage Goals

- **Backend:** >80% coverage
- **Frontend:** >70% coverage
- **Critical paths:** >90% coverage

---

## 🚀 Deployment

### Production Build

**Backend:**

```bash
cd Backend
npm ci --production
NODE_ENV=production npm start
```

**Frontend:**

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Docker Deployment

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrated and backed up
- [ ] SSL certificates valid
- [ ] DNS configured
- [ ] Monitoring enabled
- [ ] Secrets rotated
- [ ] Tests passing
- [ ] Security audit completed

**Detailed guide:** [Deployment Documentation](./docs/09-devops/production-deployment-checklist.md)

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Commit your changes**

   ```bash
   git commit -m "feat: add amazing feature"
   ```

4. **Push to the branch**

   ```bash
   git push origin feature/amazing-feature
   ```

5. **Open a Pull Request**

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Code Style

- **Backend:** ESLint with Airbnb config
- **Frontend:** ESLint with React config
- **Formatting:** Prettier
- **Commit hooks:** Husky + lint-staged

---

## 📊 Project Status

### Current Version: v1.0.0

### Roadmap

**v1.1.0** (Q1 2025)

- [ ] Redis caching layer
- [ ] Hotel reviews and ratings
- [ ] Mobile app (React Native)
- [ ] Dark mode

**v1.2.0** (Q2 2025)

- [ ] Loyalty program
- [ ] Payment integration (Stripe)
- [ ] Admin analytics dashboard
- [ ] Multi-language support

**v2.0.0** (2026)

- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] AI-powered recommendations
- [ ] Platform expansion (vacation rentals)

**Full roadmap:** [Future Enhancements](./docs/11-maintenance/future-enhancements.md)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

- **Project Lead:** [Your Name]
- **Backend Developer:** [Name]
- **Frontend Developer:** [Name]
- **UI/UX Designer:** [Name]

---

## 📞 Support

- **Documentation:** [docs/](./docs)
- **Issues:** [GitHub Issues](https://github.com/yourusername/StayHaven/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/StayHaven/discussions)
- **Email:** <support@stayhaven.com>

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Backend framework
- [React](https://reactjs.org/) - Frontend library
- [MongoDB](https://www.mongodb.com/) - Database
- [Socket.IO](https://socket.io/) - Real-time communication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vite](https://vitejs.dev/) - Build tool
- [Cloudinary](https://cloudinary.com/) - Image hosting

---

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

<div align="center">
  <p>Made with ❤️ by the StayHaven Team</p>
  <p>© 2024-2026 StayHaven. All rights reserved.</p>
</div>
