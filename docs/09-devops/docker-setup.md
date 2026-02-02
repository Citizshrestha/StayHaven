# Docker Setup

> Complete Docker containerization guide for StayHaven application

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Docker Architecture](#docker-architecture)
3. [Dockerfiles](#dockerfiles)
4. [Docker Compose](#docker-compose)
5. [Building Images](#building-images)
6. [Running Containers](#running-containers)

---

## 🎯 Overview

### Why Docker?

```
Benefits:
✅ Consistent environments (dev = staging = prod)
✅ Easy deployment
✅ Isolated dependencies
✅ Scalability
✅ Version control for infrastructure
```

---

## 🏗️ Docker Architecture

```
StayHaven Docker Stack:

┌────────────────────────────────────────┐
│          Nginx (Reverse Proxy)         │
│              Port 80/443               │
└─────────────┬──────────────┬───────────┘
              │              │
    ┌─────────┴───────┐  ┌───┴──────────┐
    │   Frontend      │  │   Backend    │
    │   (React)       │  │   (Node.js)  │
    │   Port 3000     │  │   Port 5000  │
    └─────────────────┘  └───┬──────────┘
                             │
                   ┌─────────┴──────────┐
                   │     MongoDB        │
                   │    Port 27017      │
                   └────────────────────┘
```

---

## 📝 Dockerfiles

### Backend Dockerfile

**File**: `Backend/Dockerfile`

```dockerfile
# Multi-stage build for smaller image size

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Stage 2: Production
FROM node:18-alpine

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

### Frontend Dockerfile

**File**: `frontend/Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**File**: `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🐳 Docker Compose

### Development Environment

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:6
    container_name: stayhaven-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-password}
      MONGO_INITDB_DATABASE: stayhaven
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - stayhaven-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    container_name: stayhaven-backend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 5000
      MONGODB_URI: mongodb://admin:password@mongodb:27017/stayhaven?authSource=admin
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
      FRONTEND_URL: http://localhost:3000
    ports:
      - "5000:5000"
    volumes:
      - ./Backend:/app
      - /app/node_modules
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - stayhaven-network
    command: npm run dev

  # Frontend Application
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: builder
    container_name: stayhaven-frontend
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:5000/api
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - stayhaven-network
    command: npm run dev

networks:
  stayhaven-network:
    driver: bridge

volumes:
  mongodb_data:
  mongodb_config:
```

### Production Environment

**File**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - stayhaven-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  backend:
    image: stayhaven/backend:latest
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on:
      - mongodb
    networks:
      - stayhaven-network
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  frontend:
    image: stayhaven/frontend:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - stayhaven-network
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M

networks:
  stayhaven-network:
    driver: overlay

volumes:
  mongodb_data:
    driver: local
```

---

## 🏗️ Building Images

### Build Commands

```bash
# Build backend image
docker build -t stayhaven/backend:latest ./Backend

# Build frontend image
docker build -t stayhaven/frontend:latest ./frontend

# Build all services
docker-compose build

# Build with no cache
docker-compose build --no-cache

# Build specific service
docker-compose build backend
```

### Optimize Build

**.dockerignore**:

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
README.md
.vscode
.DS_Store
coverage
*.test.js
*.spec.js
```

---

## 🚀 Running Containers

### Development

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production

```bash
# Deploy stack
docker stack deploy -c docker-compose.prod.yml stayhaven

# List services
docker stack services stayhaven

# Scale backend
docker service scale stayhaven_backend=3

# Update service
docker service update --image stayhaven/backend:v2 stayhaven_backend

# Remove stack
docker stack rm stayhaven
```

---

## 🔍 Debugging

```bash
# Access container shell
docker exec -it stayhaven-backend sh

# View container stats
docker stats

# Inspect container
docker inspect stayhaven-backend

# View container processes
docker top stayhaven-backend
```

---

## 📌 Summary

Docker in StayHaven:
- **Multi-stage builds**: Smaller images
- **Docker Compose**: Easy orchestration
- **Health checks**: Automatic recovery
- **Production-ready**: Scalable deployment
- **Development**: Hot reload support

**Goal**: Consistent, scalable containerized deployment.