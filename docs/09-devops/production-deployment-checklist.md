# Production Deployment Checklist

> Pre-deployment checklist to ensure smooth production releases

---

## ✅ Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage meets threshold (80%+)
- [ ] Linting passes with no errors
- [ ] Code reviewed and approved
- [ ] No console.log or debug code
- [ ] No TODO comments for critical items

### Security

- [ ] Dependencies updated and audited
- [ ] No critical/high vulnerabilities
- [ ] Environment variables secured
- [ ] Secrets rotated if needed
- [ ] HTTPS/SSL certificates valid
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation in place

### Database

- [ ] Database backup created
- [ ] Migration scripts tested
- [ ] Indexes optimized
- [ ] Connection pooling configured
- [ ] Backup retention policy set

### Configuration

- [ ] Environment variables set
- [ ] Production config verified
- [ ] Logging level set to appropriate level
- [ ] Monitoring configured
- [ ] Error tracking enabled (Sentry/etc)
- [ ] Health check endpoints working

### Performance

- [ ] Load testing completed
- [ ] Response times acceptable (<500ms)
- [ ] Database queries optimized
- [ ] Caching configured
- [ ] CDN configured for static assets
- [ ] Image optimization enabled

### Documentation

- [ ] API documentation updated
- [ ] Changelog updated
- [ ] Deployment notes prepared
- [ ] Rollback procedure documented
- [ ] Known issues documented

---

## 🚀 Deployment Steps

### 1. Pre-Deployment

```bash
# Create backup
mongodump --uri="$PROD_MONGODB_URI" --out=/backups/pre-deploy-$(date +%Y%m%d)

# Tag release
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# Notify team
# Post in Slack: "Starting deployment of v1.2.3"
```

### 2. Deployment

```bash
# Backend
cd Backend
git pull origin main
npm ci --production
pm2 restart stayhaven-api

# Frontend
cd frontend
npm run build
aws s3 sync dist/ s3://stayhaven-production/
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

### 3. Post-Deployment

```bash
# Verify deployment
curl -f https://api.stayhaven.com/health || echo "Health check failed!"

# Check logs
pm2 logs stayhaven-api --lines 50

# Monitor metrics
# Check:
# - Response times
# - Error rates
# - CPU/Memory usage
```

### 4. Smoke Testing

- [ ] Homepage loads correctly
- [ ] User can log in
- [ ] Search functionality works
- [ ] Booking flow works
- [ ] Payment processing works
- [ ] Email notifications sent
- [ ] API endpoints responding

---

## 🔴 Rollback Procedure

### If Deployment Fails

```bash
# 1. Revert to previous version
pm2 stop stayhaven-api
git reset --hard v1.2.2
npm ci --production
pm2 start stayhaven-api

# 2. Restore frontend
aws s3 sync s3://stayhaven-production-backup/ s3://stayhaven-production/
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"

# 3. Restore database (if needed)
mongorestore --uri="$PROD_MONGODB_URI" /backups/pre-deploy-20240101/

# 4. Notify team
# Post in Slack: "Deployment rolled back to v1.2.2"
```

---

## 📊 Post-Deployment Monitoring

### First 30 Minutes

- [ ] Monitor error rates
- [ ] Check application logs
- [ ] Verify user activity normal
- [ ] Monitor server resources
- [ ] Check third-party integrations

### First 24 Hours

- [ ] Review performance metrics
- [ ] Check for new error patterns
- [ ] Verify all features working
- [ ] Monitor user feedback
- [ ] Review analytics data

---

## 📢 Communication

### Before Deployment

```
To: team@stayhaven.com
Subject: Production Deployment Scheduled

Deployment Details:
- Version: v1.2.3
- Date: 2024-12-01
- Time: 02:00 AM UTC
- Duration: ~30 minutes
- Downtime: None expected

Changes:
- New hotel search feature
- Bug fixes for booking flow
- Performance improvements

Rollback Plan: Available
```

### After Deployment

```
To: team@stayhaven.com
Subject: Production Deployment Complete - v1.2.3

Deployment Status: ✅ Successful

Deployed:
- Backend API
- Frontend application
- Database migrations

Verification:
✅ Health checks passing
✅ Smoke tests passed
✅ No errors in logs

Monitoring: In progress for next 24 hours
```

---

## 📌 Summary

Production deployment checklist:
- **Pre-deployment**: 30+ checks
- **Deployment**: Step-by-step guide
- **Post-deployment**: Monitoring plan
- **Rollback**: Emergency procedure
- **Communication**: Team notifications

**Goal**: Zero-downtime, reliable deployments.

---

## 🔗 Related Documentation

- [CI/CD Pipeline](./ci-cd-pipeline.md)
- [Docker Setup](./docker-setup.md)
- [Staging vs Production](./staging-vs-production.md)
- [Build and Run Guide](./build-and-run-guide.md)