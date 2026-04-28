# ⚡ Quick Start - Security Fix

## 🚀 5-Minute Security Setup

### Step 1: Generate New Secrets (2 minutes)
```bash
cd Backend
node scripts/generateSecrets.js
```
Copy the output - you'll need it in Step 3.

### Step 2: Set Up Environment Files (2 minutes)
```bash
# Backend
cd Backend
cp .env.example .env

# Frontend  
cd ../frontend
cp .env.example .env
```

### Step 3: Edit Your .env Files (1 minute)
```bash
# Backend/.env
nano Backend/.env  # or use VS Code

# Paste the secrets from Step 1
# Add your MongoDB URI, Stripe keys, etc.

# Frontend/.env
nano frontend/.env  # or use VS Code

# Add your public keys only
```

### Step 4: Install Git Hooks (30 seconds)
```bash
# Linux/Mac
chmod +x install-git-hooks.sh
./install-git-hooks.sh

# Windows
install-git-hooks.bat
```

### Step 5: Test Everything (30 seconds)
```bash
# Start backend
cd Backend
npm run dev

# Start frontend (new terminal)
cd frontend
npm run dev
```

---

## ✅ Done!

Your application is now secure. But don't forget to:

1. **Rotate exposed credentials** (see SECURITY_SETUP.md)
2. **Never commit .env files** again
3. **Review** SECURITY_SETUP.md for complete instructions

---

## 🆘 Need Help?

- **Complete Guide**: [SECURITY_SETUP.md](./SECURITY_SETUP.md)
- **Summary**: [SECURITY_FIX_SUMMARY.md](./SECURITY_FIX_SUMMARY.md)
- **Quick Reference**: [SECURITY_README.md](./SECURITY_README.md)

---

**Time to secure**: ~5 minutes  
**Time to rotate credentials**: ~30 minutes  
**Peace of mind**: Priceless 🔐
