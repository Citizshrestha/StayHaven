# Environment Variables Reference

> Complete reference of all environment variables used in StayHaven

---

## 📋 Backend Environment Variables

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment mode: development, staging, production |
| `PORT` | No | `5000` | Server port number |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB connection string |

**Examples**:
```env
# Local
MONGODB_URI=mongodb://localhost:27017/stayhaven

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/stayhaven
```

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | Yes | - | Secret key for access tokens |
| `JWT_REFRESH_SECRET` | Yes | - | Secret key for refresh tokens |
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth client secret |

### Cloudinary (Image Upload)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Yes | - | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | - | Cloudinary API secret |

### Email Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_HOST` | Yes | - | SMTP server host |
| `EMAIL_PORT` | Yes | `587` | SMTP server port |
| `EMAIL_USER` | Yes | - | Email account username |
| `EMAIL_PASSWORD` | Yes | - | Email account password |
| `EMAIL_FROM` | No | `noreply@stayhaven.com` | Default sender email |

### Frontend URL

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | Yes | - | Frontend application URL (for CORS) |

---

## 🎨 Frontend Environment Variables

### API Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API base URL |
| `VITE_SOCKET_URL` | No | Same as API | Socket.IO server URL |

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |

---

## 🌍 Environment-Specific Values

### Development

**.env.development**:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/stayhaven
JWT_ACCESS_SECRET=dev_access_secret_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production
FRONTEND_URL=http://localhost:3000
```

### Staging

**.env.staging**:
```env
NODE_ENV=staging
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/stayhaven-staging
JWT_ACCESS_SECRET=${STAGING_JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${STAGING_JWT_REFRESH_SECRET}
FRONTEND_URL=https://staging.stayhaven.com
```

### Production

**.env.production**:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=${PROD_MONGODB_URI}
JWT_ACCESS_SECRET=${PROD_JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${PROD_JWT_REFRESH_SECRET}
FRONTEND_URL=https://stayhaven.com
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong secrets** in production (32+ characters)
3. **Rotate secrets regularly** (quarterly recommended)
4. **Use environment-specific secrets** (different for dev/staging/prod)
5. **Store secrets securely** (use secret management tools)

---

## 📌 Summary

All environment variables documented for:
- Backend configuration
- Frontend configuration  
- Environment-specific values
- Security best practices