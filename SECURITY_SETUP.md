# 🔐 Security Setup Guide - StayHaven

## ⚠️ CRITICAL: Your Secrets Have Been Exposed!

**If you've already pushed `.env` files to GitHub, follow the emergency steps below immediately.**

---

## 🚨 Emergency Steps (If Secrets Already Exposed)

### 1. **Rotate ALL Exposed Credentials Immediately**

#### A. JWT Secrets
```bash
# Generate new JWT secrets (run 3 times for 3 different secrets)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update in `Backend/.env`:
- `JWT_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

#### B. Database Password
1. Go to MongoDB Atlas: https://cloud.mongodb.com
2. Database Access → Edit User → Change Password
3. Update `MONGODB_URI` in `Backend/.env`

#### C. Stripe Keys
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click "Reveal test key" → "Roll key" → Confirm
3. Update both:
   - `STRIPE_SECRET_KEY` in `Backend/.env`
   - `VITE_STRIPE_PUBLIC_KEY` in `frontend/.env`

#### D. Khalti Keys
1. Go to: https://test-admin.khalti.com (or admin.khalti.com for production)
2. Settings → API Keys → Regenerate Keys
3. Update both:
   - `KHALTI_SECRET_KEY` in `Backend/.env`
   - `VITE_KHALTI_PUBLIC_KEY` in `frontend/.env`

#### E. Cloudinary Credentials
1. Go to: https://cloudinary.com/console
2. Settings → Security → Reset API Secret
3. Update in `Backend/.env`:
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

#### F. SMTP Password
1. Go to: https://app.brevo.com/settings/keys/smtp
2. Generate new SMTP key
3. Update `SMTP_PASS` in `Backend/.env`

#### G. GitHub Token
1. Go to: https://github.com/settings/tokens
2. Delete the exposed token
3. Generate new token with same permissions
4. Update `GITHUB_TOKEN` in `Backend/.env`

### 2. **Remove Secrets from Git History**

```bash
# WARNING: This rewrites git history. Coordinate with your team!

# Install BFG Repo-Cleaner
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env files from history
java -jar bfg.jar --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This affects all collaborators!)
git push origin --force --all
```

**Alternative (Safer)**: If you can't rewrite history, consider creating a new repository and migrating code without the .env files.

---

## ✅ Proper Setup (Going Forward)

### Step 1: Set Up Environment Files

#### Backend Setup
```bash
cd Backend
cp .env.example .env
```

Edit `Backend/.env` and replace ALL placeholder values:

```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_SECRET

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_ACCESS_SECRET

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_REFRESH_SECRET
```

#### Frontend Setup
```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` with your public keys only.

### Step 2: Verify .gitignore

Ensure `.gitignore` contains:
```
.env
.env.local
.env*.local
Backend/.env
frontend/.env
```

### Step 3: Test Configuration

```bash
# Backend
cd Backend
npm run dev

# Frontend (in new terminal)
cd frontend
npm run dev
```

---

## 🔒 Security Best Practices

### 1. **Never Commit Secrets**
- ✅ Use `.env.example` with placeholders
- ✅ Keep actual `.env` files local only
- ❌ Never commit `.env` files
- ❌ Never hardcode secrets in code

### 2. **Use Different Secrets for Each Environment**
- Development: Test/sandbox keys
- Staging: Separate test keys
- Production: Production keys only

### 3. **Rotate Secrets Regularly**
- JWT secrets: Every 90 days
- API keys: Every 180 days
- Database passwords: Every 90 days

### 4. **Use Secret Management Services (Production)**

For production, consider using:
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**

Example with AWS Secrets Manager:
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}
```

### 5. **Environment-Specific Configuration**

```javascript
// config/index.js
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    stripeKey: process.env.STRIPE_TEST_KEY,
  },
  production: {
    apiUrl: 'https://api.stayhaven.com',
    stripeKey: process.env.STRIPE_LIVE_KEY,
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

---

## 📋 Security Checklist

### Before Every Deployment

- [ ] All secrets are in environment variables (not hardcoded)
- [ ] `.env` files are in `.gitignore`
- [ ] No secrets in git history
- [ ] Different secrets for dev/staging/production
- [ ] All team members have their own `.env` files
- [ ] Production secrets are in secret management service
- [ ] API keys have appropriate permissions/scopes
- [ ] Database users have minimum required permissions
- [ ] HTTPS is enabled in production
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is in place

### Monthly Security Review

- [ ] Review access logs for suspicious activity
- [ ] Check for unused API keys and revoke them
- [ ] Verify all secrets are still secure
- [ ] Update dependencies with security patches
- [ ] Review and rotate secrets if needed

---

## 🆘 If You Suspect a Breach

1. **Immediately rotate all credentials**
2. **Check access logs** for unauthorized access
3. **Notify your team** and stakeholders
4. **Review recent changes** in the database
5. **Enable 2FA** on all service accounts
6. **Document the incident** for future reference
7. **Consider hiring** a security consultant

---

## 📞 Security Contacts

- **MongoDB Atlas Support**: https://support.mongodb.com
- **Stripe Security**: security@stripe.com
- **Cloudinary Support**: https://support.cloudinary.com
- **GitHub Security**: https://github.com/security

---

## 🔗 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)

---

**Remember**: Security is not a one-time setup. It's an ongoing process!

*Last updated: 2026-04-16*
