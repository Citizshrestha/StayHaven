# Deployment Architecture

> Production deployment strategy for StayHaven

---

## 📋 Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Nginx Configuration](#nginx-configuration)
4. [Process Management](#process-management)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Logging](#monitoring--logging)

---

## 🌍 Deployment Overview

### Deployment Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS (443)
                         │
         ┌───────────────▼────────────────┐
         │      Cloudflare CDN            │
         │  (DDoS Protection, SSL, Cache) │
         └───────────────┬────────────────┘
                         │
                         │ HTTPS
                         │
         ┌───────────────▼────────────────┐
         │     Nginx Reverse Proxy        │
         │   (Load Balancer, SSL Term)    │
         │                                │
         │   ┌─────────────────────────┐  │
         │   │  Static Files (React)   │  │
         │   │  /var/www/stayhaven     │  │
         │   └─────────────────────────┘  │
         └─┬──────────────┬───────────────┘
           │              │
           │              │ Proxy Pass
           │              │
   ┌───────▼──────┐  ┌───▼──────────┐  ┌──────────────┐
   │  Node.js #1  │  │ Node.js #2   │  │ Node.js #3   │
   │  (PM2)       │  │ (PM2)        │  │ (PM2)        │
   │  Port 5001   │  │ Port 5002    │  │ Port 5003    │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                 │                  │
          └─────────────────┼──────────────────┘
                            │
                ┌───────────▼────────────┐
                │   MongoDB Atlas        │
                │   (Cloud Database)     │
                │   - Replica Set        │
                │   - Auto Backups       │
                └────────────────────────┘
                            │
                ┌───────────▼────────────┐
                │   Redis Cloud          │
                │   (Cache & Sessions)   │
                └────────────────────────┘
                            │
                ┌───────────▼────────────┐
                │   External Services    │
                │   - Cloudinary (CDN)   │
                │   - SendGrid (Email)   │
                │   - Stripe (Payments)  │
                └────────────────────────┘
```

### Deployment Environments

| Environment | Purpose | URL | Branch |
|---|---|---|---|
| **Development** | Local development | `localhost:5173` | `develop` |
| **Staging** | Pre-production testing | `staging.stayhaven.com` | `staging` |
| **Production** | Live application | `stayhaven.com` | `main` |

---

## 🏗️ Infrastructure Setup

### Server Requirements

#### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 50 GB SSD
- **OS**: Ubuntu 22.04 LTS or later
- **Network**: 100 Mbps

#### Recommended for Production

- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 100 GB SSD (NVMe)
- **OS**: Ubuntu 22.04 LTS
- **Network**: 1 Gbps
- **Backup**: Daily automated backups

### Server Setup Script

```bash
#!/bin/bash
# setup-server.sh - Initial server setup

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /var/www/stayhaven
sudo chown -R $USER:$USER /var/www/stayhaven

# Clone repository
cd /var/www/stayhaven
git clone https://github.com/your-username/stayhaven.git .

# Install dependencies
cd Backend && npm install --production
cd ../frontend && npm install

# Build frontend
npm run build

echo "Server setup complete!"
```

---

## 🔧 Nginx Configuration

### Full Nginx Config

```nginx
# /etc/nginx/sites-available/stayhaven

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name stayhaven.com www.stayhaven.com;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name stayhaven.com www.stayhaven.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/stayhaven.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stayhaven.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    
    # Client upload size
    client_max_body_size 10M;
    
    # Frontend static files (React build)
    root /var/www/stayhaven/frontend/dist;
    index index.html;
    
    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Socket.IO WebSocket proxy
    location /socket.io/ {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}

# Backend load balancing
upstream backend_servers {
    least_conn;  # Use least connections algorithm
    server 127.0.0.1:5001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:5002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:5003 max_fails=3 fail_timeout=30s;
}
```

### Enable Nginx Config

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/stayhaven /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL Certificate Setup

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d stayhaven.com -d www.stayhaven.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

---

## ⚙️ Process Management

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'stayhaven-api-1',
      script: './Backend/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './logs/api-1-error.log',
      out_file: './logs/api-1-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M'
    },
    {
      name: 'stayhaven-api-2',
      script: './Backend/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5002
      },
      error_file: './logs/api-2-error.log',
      out_file: './logs/api-2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M'
    },
    {
      name: 'stayhaven-api-3',
      script: './Backend/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5003
      },
      error_file: './logs/api-3-error.log',
      out_file: './logs/api-3-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M'
    }
  ]
};
```

### PM2 Commands

```bash
# Start all apps
pm2 start ecosystem.config.js

# Restart all apps
pm2 restart all

# Stop all apps
pm2 stop all

# Delete all apps
pm2 delete all

# Monitor apps
pm2 monit

# View logs
pm2 logs

# View app status
pm2 status

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Run the command it outputs

# Reload with zero downtime
pm2 reload all
```

---

## 🔐 Environment Configuration

### Backend .env (Production)

```env
# Server
NODE_ENV=production
PORT=5001

# Frontend URL
FRONTEND_URL=https://stayhaven.com

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/stayhaven?retryWrites=true&w=majority

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_ACCESS_SECRET=your_access_secret_here_64_chars_minimum
JWT_REFRESH_SECRET=your_refresh_secret_here_64_chars_minimum
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@stayhaven.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://stayhaven.com/api/auth/google/callback

# Redis
REDIS_URL=redis://default:password@redis-cloud.com:6379

# Logging
LOG_LEVEL=info
```

### Frontend .env (Production)

```env
# API URL
VITE_API_URL=https://stayhaven.com/api

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Socket.IO
VITE_SOCKET_URL=https://stayhaven.com
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install backend dependencies
        working-directory: ./Backend
        run: npm ci
      
      - name: Run backend tests
        working-directory: ./Backend
        run: npm test
      
      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Build frontend
        working-directory: ./frontend
        run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/stayhaven
            git pull origin main
            cd Backend && npm install --production
            cd ../frontend && npm install && npm run build
            pm2 reload all
            echo "Deployment completed at $(date)"
```

### Manual Deployment Script

```bash
#!/bin/bash
# deploy.sh - Manual deployment script

set -e  # Exit on error

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Backend
echo "Updating backend..."
cd Backend
npm install --production
cd ..

# Frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Reload PM2
echo "Reloading PM2..."
pm2 reload all

echo "Deployment complete!"
echo "Deployed at: $(date)"
```

---

## 📊 Monitoring & Logging

### PM2 Monitoring

```bash
# Install PM2 plus for advanced monitoring
pm2 plus

# View real-time metrics
pm2 monit

# View logs
pm2 logs --lines 100

# Flush logs
pm2 flush
```

### Log Rotation

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### Uptime Monitoring

Use services like:
- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Website monitoring
- **New Relic**: Full-stack monitoring
- **Datadog**: Infrastructure monitoring

### Error Tracking

```javascript
// Sentry integration in server.js
const Sentry = require('@sentry/node');

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0
  });
  
  // Request handler must be first
  app.use(Sentry.Handlers.requestHandler());
  
  // Error handler must be last
  app.use(Sentry.Handlers.errorHandler());
}
```

---

## 🔄 Backup & Recovery

### Database Backup

```bash
#!/bin/bash
# backup-db.sh - MongoDB backup script

DATE=$(date +%Y-%m-%d-%H-%M)
BACKUP_DIR="/var/backups/mongodb"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/backup-$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Automated Backup Cron

```bash
# Add to crontab
crontab -e

# Run backup daily at 2 AM
0 2 * * * /var/www/stayhaven/scripts/backup-db.sh
```

---

## 📚 Related Documents

- [System Architecture Overview](./system-architecture-overview.md)
- [Security Measures](../05-security/security-best-practices.md)
- [Database Management](../06-database/database-design.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive deployment architecture with Nginx, PM2, CI/CD
