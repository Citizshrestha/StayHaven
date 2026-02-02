# Staging vs Production

> Key differences between staging and production environments

---

## 🎯 Purpose

### Staging Environment

```
Purpose:
✅ Pre-production testing
✅ QA validation
✅ Client demos
✅ Integration testing
✅ Performance testing
```

### Production Environment

```
Purpose:
✅ Live user traffic
✅ Real transactions
✅ Business operations
✅ Maximum reliability
✅ Optimal performance
```

---

## 📊 Environment Comparison

| Aspect | Staging | Production |
|--------|---------|------------|
| **URL** | staging.stayhaven.com | stayhaven.com |
| **Database** | Staging MongoDB | Production MongoDB |
| **Data** | Test/sample data | Real user data |
| **Users** | Internal team | Public users |
| **Uptime** | 95%+ | 99.9%+ |
| **Monitoring** | Basic | Comprehensive |
| **Backups** | Daily | Hourly |
| **SSL** | Let's Encrypt | Premium SSL |
| **CDN** | Optional | Required |
| **Auto-deploy** | Yes (on push to develop) | No (manual approval) |

---

## 🔧 Configuration Differences

### Backend

**Staging**:
```env
NODE_ENV=staging
MONGODB_URI=mongodb://staging-db/stayhaven
LOG_LEVEL=debug
RATE_LIMIT=1000/hour
```

**Production**:
```env
NODE_ENV=production
MONGODB_URI=mongodb://prod-db/stayhaven
LOG_LEVEL=error
RATE_LIMIT=100/hour
```

### Frontend

**Staging**:
```env
VITE_API_URL=https://staging-api.stayhaven.com
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=debug
```

**Production**:
```env
VITE_API_URL=https://api.stayhaven.com
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=error
```

---

## 🔄 Promotion Process

```
1. Merge feature to develop branch
           ↓
2. Auto-deploy to staging
           ↓
3. Run automated tests
           ↓
4. Manual QA testing
           ↓
5. Approval required
           ↓
6. Merge develop to main
           ↓
7. Deploy to production
```

---

## ✅ Best Practices

1. **Test in staging first**: Never skip staging
2. **Match production**: Keep staging similar to prod
3. **Use realistic data**: Test with production-like data
4. **Monitor both**: Track metrics in both environments
5. **Document differences**: Maintain environment docs
6. **Automate tests**: Run tests before production
7. **Quick rollback**: Have rollback plan ready

---

## 📌 Summary

Key differences:
- **Staging**: Safe testing ground
- **Production**: Live user environment
- **Process**: Always test in staging first
- **Goal**: Catch issues before production

**Remember**: Staging should mirror production as closely as possible.