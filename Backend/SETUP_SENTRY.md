# Sentry Setup Instructions

## ⚠️ Current Status: DISABLED

Sentry is currently disabled. Your backend server will run without it.

---

## To Enable Sentry (Optional):

### Step 1: Install Sentry Dependencies

Run this command in the Backend directory:

```bash
npm install @sentry/node @sentry/profiling-node
```

### Step 2: Uncomment Sentry Code

Open `Backend/config/sentry.js` and:
1. Delete the stub implementation at the top (lines 1-20)
2. Uncomment the real Sentry code at the bottom (remove the `/*` and `*/`)

### Step 3: Sign Up for Sentry

### Step 3: Sign Up for Sentry

1. Go to https://sentry.io
2. Create a free account (supports up to 5,000 errors/month)
3. Create a new project and select "Node.js" as the platform
4. Copy your DSN (Data Source Name)

### Step 4: Add DSN to Environment Variables

### Step 4: Add DSN to Environment Variables

Add this to your `Backend/.env` file:

```env
# Sentry Error Monitoring
SENTRY_DSN=https://your-public-key@o123456.ingest.sentry.io/123456

# Set to production for production environment
NODE_ENV=production
```

### Step 5: Restart Server

### Step 5: Restart Server

```bash
npm start
```

You should see this message in the console:
```
✅ Sentry initialized for error monitoring
```

If you don't have a Sentry DSN, you'll see:
```
⚠️  Sentry DSN not configured. Error monitoring disabled.
```

---

## Without Sentry (Current Setup)

Your server will show:
```
⚠️  Sentry is disabled. Install @sentry/node and @sentry/profiling-node to enable error monitoring.
```

This is normal and your application will work perfectly fine without Sentry.

---

## Step 6: Test Error Capture (After Enabling)

Create a test error to verify Sentry is working:

```bash
# This will trigger a test error
curl -X GET http://localhost:3000/api/test-error
```

Check your Sentry dashboard - you should see the error appear within seconds.

## Features Enabled

✅ Automatic error capture
✅ Performance monitoring (API response times)
✅ User context (who encountered the error)
✅ Request context (path, method, body)
✅ Stack traces with line numbers
✅ Email/Slack alerts
✅ Error grouping and deduplication

## Optional: Add Test Error Route

Add this to `Backend/server.js` for testing:

```javascript
// Test error route (remove in production)
app.get('/api/test-error', (req, res, next) => {
  const error = new Error('This is a test error for Sentry');
  error.statusCode = 500;
  next(error);
});
```

## Sentry Dashboard

Access your Sentry dashboard at:
```
https://sentry.io/organizations/your-org/issues/
```

You'll see:
- Error frequency and trends
- Stack traces with source code
- User impact (how many users affected)
- Performance metrics
- Release tracking

## Cost

- **Free Tier**: 5,000 errors/month, 10,000 performance units/month
- **Team Plan**: $26/month for 50,000 errors/month
- **Business Plan**: $80/month for 100,000 errors/month

For most applications, the free tier is sufficient during development and early production.

## Disable Sentry

To disable Sentry temporarily:

1. Remove or comment out `SENTRY_DSN` in `.env`
2. Restart server

The application will continue to work normally without Sentry.
