# Sentry Installation Guide

## Current Status
Sentry error monitoring is **configured but disabled**. The backend server runs perfectly without it.

## Why Enable Sentry?
- Real-time error tracking and alerting
- Performance monitoring
- Stack traces for debugging
- Error trends and analytics
- Production issue detection

---

## Option 1: Install Without Profiling (Recommended - No Python Required)

This is the simplest option and works on all systems without additional dependencies.

### Step 1: Install Sentry Package
```bash
cd Backend
npm install @sentry/node --omit=optional
```

### Step 2: Get Your Sentry DSN
1. Sign up at https://sentry.io (free tier available)
2. Create a new project (select Node.js/Express)
3. Copy your DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### Step 3: Add DSN to Environment
Edit `Backend/.env` and add:
```env
SENTRY_DSN=your_sentry_dsn_here
```

### Step 4: Enable Sentry in Code
Edit `Backend/config/sentry.js`:
1. Uncomment the code block at the bottom (lines starting with `import * as Sentry`)
2. Comment out or remove the stub implementation at the top
3. Save the file

### Step 5: Restart Server
```bash
npm run dev
```

You should see: `✅ Sentry initialized for error monitoring`

---

## Option 2: Install With Profiling (Requires Python)

Profiling provides detailed performance insights but requires Python to be installed.

### Prerequisites
- Python 3.6+ installed and in PATH
- Visual Studio Build Tools (Windows) or build-essential (Linux)

### Step 1: Install Python
**Windows:**
1. Download from https://www.python.org/downloads/
2. Run installer and check "Add Python to PATH"
3. Verify: `python --version`

**Linux/Mac:**
```bash
# Usually pre-installed, verify with:
python3 --version
```

### Step 2: Install Sentry with Profiling
```bash
cd Backend
npm install @sentry/node @sentry/profiling-node
```

### Step 3-5: Same as Option 1
Follow steps 2-5 from Option 1 above.

---

## Troubleshooting

### Error: "Could not find any Python installation"
**Solution:** Use Option 1 (without profiling) or install Python first.

### Error: "gyp ERR! find Python"
**Solution:** 
```bash
# Remove failed installation
rm -rf node_modules/@sentry
npm cache clean --force

# Install without profiling
npm install @sentry/node --omit=optional
```

### Error: "SENTRY_DSN not configured"
**Solution:** Add `SENTRY_DSN=your_dsn_here` to `Backend/.env`

### Server still shows "Sentry is disabled"
**Solution:** Make sure you uncommented the code in `Backend/config/sentry.js`

---

## Verification

After installation, check that Sentry is working:

1. **Server Startup:**
   ```
   ✅ Sentry initialized for error monitoring
   🚀 Server running on port 3000
   ```

2. **Test Error Capture:**
   Create a test error in your code:
   ```javascript
   throw new Error("Test Sentry error");
   ```
   
3. **Check Sentry Dashboard:**
   - Go to https://sentry.io
   - Navigate to your project
   - You should see the error appear within seconds

---

## Configuration Options

### Environment-Based Configuration
```env
# .env file
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
NODE_ENV=production  # or development
```

### Sampling Rates
Edit `Backend/config/sentry.js`:
```javascript
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
// 0.1 = 10% of transactions in production
// 1.0 = 100% of transactions in development
```

### Sensitive Data Filtering
Already configured to redact:
- password
- token
- apiKey
- secret
- cardNumber
- cvv

Add more fields in `beforeSend` function if needed.

---

## Production Deployment

### Recommended Settings
```env
NODE_ENV=production
SENTRY_DSN=your_production_dsn
```

### Performance Impact
- Minimal overhead (<1% CPU)
- Async error reporting (non-blocking)
- Configurable sampling rates

### Best Practices
1. Use separate Sentry projects for dev/staging/production
2. Set appropriate sampling rates (10-20% for production)
3. Configure alert rules in Sentry dashboard
4. Review errors weekly
5. Set up Slack/email notifications

---

## Cost

### Free Tier (Sentry.io)
- 5,000 errors/month
- 10,000 performance units/month
- 1 GB attachments
- 30-day retention
- Perfect for small to medium projects

### Paid Tiers
- Start at $26/month for more volume
- Enterprise options available

---

## Alternative: Self-Hosted Sentry

If you prefer to host Sentry yourself:
1. Follow https://develop.sentry.dev/self-hosted/
2. Use Docker Compose setup
3. Point SENTRY_DSN to your self-hosted instance

---

## Summary

**Current Status:** Backend works perfectly without Sentry (stub implementation)

**To Enable:**
1. Run: `npm install @sentry/node --omit=optional`
2. Get DSN from sentry.io
3. Add to .env: `SENTRY_DSN=your_dsn`
4. Uncomment code in `Backend/config/sentry.js`
5. Restart server

**Benefits:** Real-time error tracking, performance monitoring, production debugging

**No Python?** Use Option 1 (without profiling) - works perfectly!
