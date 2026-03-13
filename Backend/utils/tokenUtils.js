import jwt from "jsonwebtoken";
import crypto from "crypto";

export const getAccessTokenSecret = () =>
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

export const getRefreshTokenSecret = () =>
  process.env.JWT_REFRESH_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET;

const ensureSecret = (secret, label) => {
  if (!secret) {
    throw new Error(`${label} is not configured`);
  }
  return secret;
};

export const generateAccessToken = (id) => {
  const secret = ensureSecret(
    getAccessTokenSecret(),
    "JWT_ACCESS_SECRET/JWT_SECRET"
  );

  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || "1h", // 1 hour for better session stability
  });
};

export const generateRefreshToken = (id) => {
  const secret = ensureSecret(
    getRefreshTokenSecret(),
    "JWT_REFRESH_SECRET/JWT_ACCESS_SECRET/JWT_SECRET"
  );

  return jwt.sign({ id }, secret, {
    expiresIn: "7d", // 7 days for refresh token
  });
};

// Generate JWT (legacy function for compatibility)
export const generateToken = (id) => {
  const secret = ensureSecret(
    getAccessTokenSecret(),
    "JWT_ACCESS_SECRET/JWT_SECRET"
  );

  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Generate cryptographically secure 6-digit OTP
export const generateOTP = () => {
  // crypto.randomInt returns integer in [min, max), so use 100000..1000000
  return crypto.randomInt(100000, 1000000).toString();
};

// Alias for backward compatibility where a verification code generator was used
export const generateVerificationCode = generateOTP;


export const generateSecureToken = () => {
  // 32 bytes = 256 bits of randomness 
  // toString('hex') converts to readable string (64 characters)
  return crypto.randomBytes(32).toString("hex");
};


// Hash a token for storage
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};