# Local Environment Setup

> Complete guide to setting up StayHaven development environment locally

---

## 📋 Prerequisites

### Required Software

```
✅ Node.js 18+ (LTS recommended)
✅ MongoDB 6+
✅ Git
✅ VS Code (recommended)
```

### Optional Tools

```
• Docker Desktop
• Postman (API testing)
• MongoDB Compass (Database GUI)
```

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-username/stayhaven.git
cd stayhaven
```

### 2. Install Dependencies

```bash
# Backend
cd Backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Setup Environment Variables

**Backend** `.env`:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGDB_URI=mongodb://localhost:27017/stayhaven

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Frontend** `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Start MongoDB

```bash
# Using mongod
mongod --dbpath /path/to/data/db

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6
```

### 5. Run Applications

```bash
# Terminal 1: Backend
cd Backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 6. Access Application

```
Frontend: http://localhost:3000
Backend API: http://localhost:5000/api
```

---

## 🔧 Detailed Setup

### Node.js Installation

```bash
# Windows (using Chocolatey)
choco install nodejs-lts

# macOS (using Homebrew)
brew install node@18

# Verify installation
node --version  # Should be 18.x
npm --version   # Should be 9.x+
```

### MongoDB Installation

**Windows**:

```powershell
# Using Chocolatey
choco install mongodb

# Or download from https://www.mongodb.com/try/download/community
```

**macOS**:

```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community
```

**Verify**:

```bash
mongosh
# Should connect to MongoDB shell
```

---

## 📌 Summary

Local setup complete! You should now have:
- ✅ Backend running on port 5000
- ✅ Frontend running on port 3000
- ✅ MongoDB running on port 27017

**Next steps**: Check [Build and Run Guide](./build-and-run-guide.md)