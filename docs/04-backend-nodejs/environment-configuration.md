# Environment Configuration

> Comprehensive guide to environment variables, configuration management, and deployment settings in StayHaven

---

## 📋 Table of Contents

1. [Environment Variables](#environment-variables)
2. [Configuration Files](#configuration-files)
3. [Environment Setup](#environment-setup)
4. [Security Best Practices](#security-best-practices)
5. [Deployment Configurations](#deployment-configurations)

---

## 🔐 Environment Variables

### Required Environment Variables

StayHaven requires the following environment variables to function properly:

#### 1. Server Configuration

```env
# Server Port
PORT=5000

# Node Environment (development, production, testing)
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

#### 2. Database

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/stayhaven
# Or MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/stayhaven?retryWrites=true&w=majority
```

#### 3. JWT Secrets

```env
# JWT Access Token Secret (short-lived: 1 hour)
JWT_ACCESS_SECRET=your_access_secret_key_here_min_32_chars

# JWT Refresh Token Secret (long-lived: 7 days)
JWT_REFRESH_SECRET=your_refresh_secret_key_here_min_32_chars

# Token Expiry Times
JWT_ACCESS_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d
```

#### 4. Cloudinary (File Upload)

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### 5. Email Configuration (Nodemailer)

```env
# Gmail OAuth2 Configuration
MAIL_USER=your-email@gmail.com
MAIL_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
MAIL_CLIENT_SECRET=your_google_client_secret
MAIL_REFRESH_TOKEN=your_google_refresh_token

# Email From Name
MAIL_FROM=StayHaven <noreply@stayhaven.com>
```

#### 6. Google OAuth (Optional)

```env
# Google OAuth Client Credentials
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

### Complete .env.example Template

```env
# ==================================
# StayHaven Backend Configuration
# ==================================

# ----- Server Configuration -----
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# ----- Database -----
MONGODB_URI=mongodb://localhost:27017/stayhaven

# ----- JWT Secrets -----
# Generate strong secrets: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=generate_your_own_secret_key_here_min_32_chars
JWT_REFRESH_SECRET=generate_your_own_secret_key_here_min_32_chars
JWT_ACCESS_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# ----- Cloudinary (File Upload) -----
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ----- Email (Nodemailer with Gmail OAuth2) -----
MAIL_USER=your-email@gmail.com
MAIL_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
MAIL_CLIENT_SECRET=your_google_client_secret
MAIL_REFRESH_TOKEN=your_google_refresh_token
MAIL_FROM=StayHaven <noreply@stayhaven.com>

# ----- Google OAuth (Optional) -----
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# ----- Payment Gateway (Future) -----
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📁 Configuration Files

### 1. Database Configuration

**File**: `config/db.js`

```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
  // Validate environment variable
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  try {
    // Mongoose 8.x - No deprecated options needed
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

export default connectDB;
```

### 2. Cloudinary Configuration

**File**: `config/cloudinary.js`

```javascript
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
  console.warn("Cloudinary configuration is incomplete. File upload will not work.");
}

export default cloudinary;
```

### 3. Nodemailer Configuration

**File**: `config/nodemailer.js`

```javascript
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

// Create OAuth2 client
const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    process.env.MAIL_CLIENT_ID,
    process.env.MAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.MAIL_REFRESH_TOKEN,
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject("Failed to create access token");
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.MAIL_USER,
      accessToken,
      clientId: process.env.MAIL_CLIENT_ID,
      clientSecret: process.env.MAIL_CLIENT_SECRET,
      refreshToken: process.env.MAIL_REFRESH_TOKEN,
    },
  });

  return transporter;
};

export default createTransporter;
```

### 4. Socket.IO Configuration

**File**: `config/socket.js`

```javascript
import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Join hotel rooms
    socket.on('join-hotel', (hotelId) => {
      socket.join(`hotel-${hotelId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
```

---

## 🛠️ Environment Setup

### Development Setup

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/stayhaven.git
cd stayhaven/Backend
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Create .env File

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env  # or use any text editor
```

#### 4. Generate JWT Secrets

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 5. Start MongoDB

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas connection string
```

#### 6. Run Development Server

```bash
npm run dev
```

### Production Setup

#### 1. Set Environment Variables

```bash
# On Linux/Mac
export NODE_ENV=production
export MONGODB_URI=mongodb+srv://...
export JWT_ACCESS_SECRET=...
export JWT_REFRESH_SECRET=...

# On Windows
set NODE_ENV=production
set MONGODB_URI=mongodb+srv://...
```

#### 2. Build (if using TypeScript)

```bash
npm run build
```

#### 3. Start Production Server

```bash
npm start
```

---

## 🔒 Security Best Practices

### 1. **Never Commit .env Files**

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

### 2. **Use Strong Secrets**

```bash
# Generate cryptographically secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Minimum 32 characters for JWT secrets
```

### 3. **Validate Environment Variables**

```javascript
// utils/validateEnv.js
export const validateEnv = () => {
  const required = [
    'MONGODB_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('✓ All required environment variables are set');
};
```

### 4. **Use Different Values Per Environment**

```javascript
// Development
MONGODB_URI=mongodb://localhost:27017/stayhaven_dev
JWT_ACCESS_SECRET=dev_secret_key

// Production
MONGODB_URI=mongodb+srv://prod-cluster.mongodb.net/stayhaven
JWT_ACCESS_SECRET=strong_production_secret_key
```

### 5. **Restrict CORS Origins**

```javascript
// Development
FRONTEND_URL=http://localhost:5173

// Production
FRONTEND_URL=https://stayhaven.com
```

---

## 🚀 Deployment Configurations

### Render.com

```yaml
# render.yaml
services:
  - type: web
    name: stayhaven-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_ACCESS_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
```

### Heroku

```bash
# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set JWT_ACCESS_SECRET=...
heroku config:set JWT_REFRESH_SECRET=...
heroku config:set CLOUDINARY_CLOUD_NAME=...
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    env_file:
      - .env
```

### AWS EC2

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/yourusername/stayhaven.git
cd stayhaven/Backend

# Create .env
nano .env

# Install dependencies
npm install

# Use PM2 for process management
sudo npm install -g pm2
pm2 start server.js --name stayhaven-backend
pm2 startup
pm2 save
```

---

## 📚 Related Documents

- [Backend Overview](./backend-overview.md)
- [Express App Structure](./express-app-structure.md)
- [Deployment Guide](../07-deployment/deployment-guide.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive environment configuration guide
