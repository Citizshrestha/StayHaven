# Password Policy & Hashing

> Password security implementation using bcrypt, validation rules, and best practices in StayHaven

---

## 📋 Table of Contents

1. [Password Policy](#password-policy)
2. [Bcrypt Hashing](#bcrypt-hashing)
3. [Password Validation](#password-validation)
4. [Password Comparison](#password-comparison)
5. [Password Reset](#password-reset)
6. [Security Best Practices](#security-best-practices)

---

## 🔐 Password Policy

### Current Password Requirements

```javascript
// Minimum Requirements (Currently Implemented)
- Length: Minimum 6 characters
- Type: Any characters allowed (letters, numbers, symbols)
- Complexity: No specific requirements yet
```

### Recommended Password Policy (Planned)

```javascript
// Enhanced Requirements (To Be Implemented)
- Length: Minimum 8 characters
- Uppercase: At least 1 uppercase letter (A-Z)
- Lowercase: At least 1 lowercase letter (a-z)
- Number: At least 1 digit (0-9)
- Special Character: At least 1 (!@#$%^&*()_+)
- No Common Passwords: Check against common password list
- No User Info: Password cannot contain username or email
```

### Password Validation Implementation

**File**: `utils/passwordValidation.js`

```javascript
/**
 * Validate password strength (basic)
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid
 */
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return false;
  }
  return true;
};

/**
 * Enhanced password validation (planned)
 * @param {string} password - Password to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export const validatePasswordEnhanced = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Common passwords check
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'letmein'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
```

---

## 🔨 Bcrypt Hashing

### What is Bcrypt?

**Bcrypt** is a password hashing function designed for secure password storage:

- **Slow by design**: Resistant to brute-force attacks
- **Salt included**: Automatic salt generation
- **Adaptive**: Configurable cost factor (work factor)

### Salt Rounds (Cost Factor)

```javascript
// Salt rounds = 2^rounds hashing iterations

Salt Rounds    Iterations    Time to Hash    Security Level
──────────────────────────────────────────────────────────
10             1,024         ~100ms         ✅ Good (StayHaven uses this)
12             4,096         ~250ms         ✅ Better
13             8,192         ~500ms         ✅ Best (recommended for high security)
14             16,384        ~1s            ⚠️  Very Secure (may impact UX)
```

### Bcrypt Implementation

**File**: `models/user.schema.js`

```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      // Password required only for non-Google users
      return !this.isGoogleUser;
    }
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  }
  // ... other fields
}, { timestamps: true });

/**
 * Hash password before saving
 * Pre-save hook runs automatically before user.save()
 */
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  // Google users don't have passwords
  if (this.isGoogleUser && !this.password) {
    return next();
  }

  try {
    // Generate salt with 10 rounds
    const salt = await bcrypt.genSalt(10);
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error) {
    next(error);
  }
});

export const User = mongoose.model('User', userSchema);
```

### How Pre-Save Hook Works

```javascript
// Example: User Registration
const user = new User({
  fullname: "John Doe",
  email: "john@example.com",
  password: "MyPassword123"  // Plain text password
});

await user.save();
// ↓ Pre-save hook triggers automatically
// ↓ Password hashed with bcrypt
// ✓ Stored in DB: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

console.log(user.password);
// Output: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
//         │  │└─ Salt (22 chars)
//         │  └─ Cost factor (10 = 2^10 = 1024 iterations)
//         └─ Bcrypt identifier
```

### Password Update Example

```javascript
// Password will be automatically hashed by pre-save hook
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  // Verify current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect"
    });
  }

  // Update password (will be hashed by pre-save hook)
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: "Password updated successfully"
  });
});
```

---

## ✅ Password Validation

### Registration Validation

```javascript
export const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;

  // 1. Check required fields
  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required"
    });
  }

  // 2. Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long"
    });
  }

  // 3. Enhanced validation (planned)
  const { valid, errors } = validatePasswordEnhanced(password);
  if (!valid) {
    return res.status(400).json({
      success: false,
      message: "Password does not meet requirements",
      errors
    });
  }

  // ... create user (password will be hashed automatically)
});
```

---

## 🔍 Password Comparison

### matchPassword Method

**File**: `models/user.schema.js`

```javascript
/**
 * Compare password with hashed password
 * @param {string} enteredPassword - Plain text password from login
 * @returns {Promise<boolean>} True if passwords match
 */
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    return false;
  }
};
```

### Login Implementation

```javascript
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email }).populate('role');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // Verify password using matchPassword method
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // ... generate tokens and send response
});
```

### How bcrypt.compare Works

```javascript
// Stored hash from database:
const storedHash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

// User enters password during login:
const enteredPassword = "MyPassword123";

// bcrypt.compare extracts salt from stored hash and hashes entered password
const isMatch = await bcrypt.compare(enteredPassword, storedHash);
// ↓ Extracts salt: "N9qo8uLOickgx2ZMRZoMye"
// ↓ Hashes entered password with extracted salt
// ↓ Compares result with stored hash
// ✓ Returns true if match, false otherwise

console.log(isMatch); // true
```

---

## 🔄 Password Reset

### Reset Flow

```javascript
// Step 1: Request OTP
POST /api/auth/sendResetPasswordOtp
{
  "email": "john@example.com"
}

// Step 2: Verify OTP
POST /api/auth/verifyResetPasswordOtp
{
  "email": "john@example.com",
  "otp": "123456"
}

// Step 3: Reset Password
POST /api/auth/resetPassword
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}
```

### Reset Implementation

```javascript
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid request"
    });
  }

  // Verify OTP
  if (user.resetOtp !== otp || user.resetOtpExpireAt < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP"
    });
  }

  // Validate new password
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long"
    });
  }

  // Update password (will be hashed by pre-save hook)
  user.password = newPassword;
  user.resetOtp = null;
  user.resetOtpExpireAt = null;
  await user.save();

  res.json({
    success: true,
    message: "Password reset successfully"
  });
});
```

---

## 🔒 Security Best Practices

### 1. Never Store Plain Text Passwords

```javascript
// ✅ CORRECT: Hash before storing
user.password = "MyPassword123";
await user.save(); // Pre-save hook hashes password

// ❌ WRONG: Store plain text
user.password = "MyPassword123";
user.skipHashMiddleware = true;
await user.save(); // Vulnerable!
```

### 2. Use Strong Salt Rounds

```javascript
// ✅ Good: 10 rounds (current)
const salt = await bcrypt.genSalt(10);

// ✅ Better: 12 rounds (recommended)
const salt = await bcrypt.genSalt(12);

// ❌ Weak: 4 rounds (fast but insecure)
const salt = await bcrypt.genSalt(4);
```

### 3. Hash Only When Password Changes

```javascript
// ✅ CORRECT: Check if password modified
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next(); // Skip hashing
  }
  // Hash password
});

// ❌ WRONG: Always hash (will hash the hash)
userSchema.pre('save', async function(next) {
  this.password = await bcrypt.hash(this.password, 10);
});
```

### 4. Don't Reveal Password Details

```javascript
// ✅ CORRECT: Generic error message
if (!isMatch) {
  return res.status(401).json({
    message: "Invalid credentials" // Don't specify which is wrong
  });
}

// ❌ WRONG: Reveals information
if (!user) {
  return res.status(401).json({
    message: "Email not found" // Helps attackers
  });
}
if (!isMatch) {
  return res.status(401).json({
    message: "Incorrect password" // Confirms email exists
  });
}
```

### 5. Implement Password History

```javascript
// Prevent password reuse (planned)
userSchema.add({
  passwordHistory: [{
    hash: String,
    changedAt: Date
  }]
});

userSchema.methods.checkPasswordHistory = async function(newPassword) {
  const recentPasswords = this.passwordHistory.slice(0, 5); // Last 5 passwords

  for (const oldPassword of recentPasswords) {
    const isReused = await bcrypt.compare(newPassword, oldPassword.hash);
    if (isReused) {
      return false; // Password was used before
    }
  }

  return true; // Password is new
};
```

### 6. Password Expiration (Optional)

```javascript
// Force password change after 90 days (planned)
userSchema.add({
  passwordChangedAt: Date,
  passwordExpiresAt: Date
});

userSchema.pre('save', function(next) {
  if (this.isModified('password')) {
    this.passwordChangedAt = Date.now();
    this.passwordExpiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000; // 90 days
  }
  next();
});
```

### 7. Account Lockout (Planned)

```javascript
// Lock account after 5 failed login attempts
userSchema.add({
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date
});

userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.lockUntil) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};
```

---

## 📚 Related Documents

- [Security Overview](./security-overview.md)
- [Authentication Flow](./authentication-flow.md)
- [API Security Best Practices](./api-security-best-practices.md)
- [Security Known Risks](./security-known-risks.md)

---

## 📅 Document Info

**Created**: February 2, 2026  
**Last Updated**: February 2, 2026  
**Version**: 1.0  
**Status**: ✅ Complete - Comprehensive password security documentation
