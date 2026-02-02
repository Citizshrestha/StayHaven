# Build and Run Guide

> Complete guide to building and running StayHaven in different environments

---

## 📋 Table of Contents

1. [Development Mode](#development-mode)
2. [Production Build](#production-build)
3. [Running Tests](#running-tests)
4. [Build Optimization](#build-optimization)

---

## 🛠️ Development Mode

### Backend

```bash
cd Backend

# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Run in debug mode
npm run dev:debug
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser automatically
npm run dev -- --open
```

---

## 🏗️ Production Build

### Backend

```bash
cd Backend

# Install production dependencies only
npm ci --production

# Run production server
NODE_ENV=production npm start

# Or using PM2
pm2 start server.js --name "stayhaven-api"
```

### Frontend

```bash
cd frontend

# Build for production
npm run build

# Preview production build locally
npm run preview

# Output: frontend/dist/
```

### Serve Frontend (Nginx)

```nginx
server {
    listen 80;
    server_name stayhaven.com;
    root /var/www/stayhaven/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

---

## 🧪 Running Tests

### Backend Tests

```bash
cd Backend

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- authController.test.js

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E in headless mode
npm run test:e2e:headless
```

---

## ⚡ Build Optimization

### Frontend Build Analysis

```bash
# Analyze bundle size
npm run build -- --mode analyze

# Output shows:
# - Bundle size
# - Chunk sizes
# - Dependency tree
```

### Optimization Tips

1. **Code Splitting**: Lazy load routes
2. **Tree Shaking**: Remove unused code
3. **Minification**: Automatic in production
4. **Compression**: Enable gzip/brotli
5. **Caching**: Use content hashing

---

## 🚀 Production Deployment

### Using PM2

```bash
# Start
pm2 start server.js --name stayhaven-api -i max

# Stop
pm2 stop stayhaven-api

# Restart
pm2 restart stayhaven-api

# Logs
pm2 logs stayhaven-api

# Monitor
pm2 monit
```

### Using Docker

```bash
# Build
docker-compose -f docker-compose.prod.yml build

# Run
docker-compose -f docker-compose.prod.yml up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 📌 Summary

Build and run StayHaven:
- **Development**: Hot reload for fast iteration
- **Production**: Optimized builds
- **Testing**: Comprehensive test suites
- **Deployment**: PM2 or Docker

**Goal**: Efficient development and reliable production deployment.