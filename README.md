# 🏨 StayHaven - Hotel Booking & Order Management System

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-blue.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v6+-green.svg)](https://www.mongodb.com/)

> A comprehensive hotel management solution that streamlines booking operations, in-room dining, and staff workflows with real-time features.

## ✨ Key Features

- **Hotel Management** - Room booking, multi-property support, dynamic pricing
- **Restaurant System** - QR code ordering, kitchen dashboard, table management
- **Staff Tools** - Role-based dashboards for waiters, kitchen staff, and managers
- **Real-time Updates** - Socket.IO powered notifications and order tracking
- **Mobile-first Design** - Responsive interface optimized for all devices

## 🛠️ Tech Stack

**Frontend:** React 18.2.0 • Vite • Tailwind CSS • Socket.IO Client  
**Backend:** Node.js • Express.js • MongoDB • Mongoose • Socket.IO  
**Services:** Cloudinary • JWT Auth • Google OAuth • Email Integration

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 6.0.0
- npm >= 9.0.0

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/StayHaven.git
cd StayHaven
```

2. **Install dependencies**
```bash
# Backend
cd Backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Environment setup**

Create `Backend/.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/stayhaven

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here_min_64_chars_long_for_security
JWT_EXPIRE=30d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
PORT=5000
NODE_ENV=development
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

4. **Start the servers**
```bash
# Backend server (Terminal 1)
cd Backend
npm run dev

# Frontend server (Terminal 2)
cd frontend
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:5173
- API: http://localhost:5000/api

## 🗄️ Database Seeding

### Initial Setup & Re-seeding

To populate your database with sample data for testing and development:

```bash
# Navigate to backend directory
cd Backend

# Seed menu items (food & drinks)
node scripts/seedMenuItems.js

# Create test guest with booking
node scripts/createTestGuestBooking.js

# Seed Nepali guest data (optional)
node scripts/seedNepaliGuests.js

# Debug guest booking (troubleshooting)
node scripts/debugGuestBooking.js
```

### When to Re-seed

You should re-seed the database when:
- Starting fresh development after database reset
- Testing new features that require sample data
- Menu items or images have been updated in seed files
- Troubleshooting data-related issues

### Important Notes

⚠️ **Before re-seeding:**
- Backup any important data (seeding may overwrite existing records)
- Ensure MongoDB is running and accessible
- Check that `MONGODB_URI` in `.env` points to the correct database

💡 **Tip:** If you encounter image loading issues (404 errors), check that:
1. The image URLs in seed files are valid and accessible
2. Cloudinary credentials are properly configured (if using Cloudinary)
3. Run the patch scripts if specific images need updating (e.g., `patchMasalaTeaImage.js`)

## 📁 Project Structure

```
StayHaven/
├── Backend/                 # Express.js API Server
│   ├── config/             # Database & service configuration
│   ├── controllers/        # Business logic & API handlers
│   ├── middleware/         # Authentication & validation
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   ├── utils/             # Helper functions
│   └── server.js          # Application entry point
│
├── frontend/              # React SPA
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts for state
│   │   ├── hooks/        # Custom React hooks
│   │   └── services/     # API service functions
│   └── package.json
│
└── docs/                 # Documentation files
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth

### Hotels & Bookings
- `GET /api/hotels` - List hotels
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details

### Orders & Dining
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update order status

## 🏃‍♂️ Development

### Code Standards
- ESLint & Prettier for code formatting
- Conventional commits for version control
- Component-driven development

### Testing
```bash
# Backend tests
cd Backend && npm test

# Frontend tests
cd frontend && npm test
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Backend (Railway/Heroku)
```bash
railway login
railway init
railway deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with ❤️ by the StayHaven Team</p>
</div>

