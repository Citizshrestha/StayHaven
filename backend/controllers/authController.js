import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { OTP } from "../models/otp.schema.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendEmail } from "../config/nodemailer.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
  getRefreshTokenSecret,
  generateSecureToken,
  hashToken,
} from "../utils/tokenUtils.js";
import { validatePasswordStrength } from "../utils/passwordValidation.js";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const normalizeEmail = value => typeof value === 'string' ? value.toLowerCase().trim() : '';
const unavailable = user => !user || user.isActive === false || user.isDeleted || user.accountStatus === 'deactivated';

// @route GET /api/auth/check
export const checkUserExists = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }
  const user = await User.findOne({ email });
  res.json({
    success: true,
    exists: !!user,
  });
});

// @route POST /api/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  // Single generic failure response for "no such user" and "wrong password"
  // (M-1: prevents using login as an email-enumeration oracle).
  const invalidCredentials = () =>
    res.status(401).json({ success: false, message: "Invalid email or password." });

  if (!email || !password) return invalidCredentials();

  const user = await User.findOne({ email }).populate('role');
  if (!user) {
    return invalidCredentials();
  }

  // Brute-force protection: the User model already tracks loginAttempts/
  // lockUntil (see user.schema.js) — this was never wired up here before,
  // so the lockout it implements never actually engaged.
  if (user.isLocked) {
    return res.status(423).json({
      success: false,
      message: "Too many failed login attempts. This account is temporarily locked — please try again later.",
    });
  }

  if (!(await user.matchPassword(password))) {
    await user.incrementLoginAttempts();
    return invalidCredentials();
  }

  await user.resetLoginAttempts();

  // M-2: reject deactivated/suspended accounts even with a correct password.
  if (unavailable(user)) {
    return res.status(403).json({
      success: false,
      message: "This account has been deactivated. Please contact support.",
    });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role?.name || 'guest',
    profilePicture: user.profilePicture,
  });
});

// @route POST /api/auth/google-login
export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      success: false,
      message: "Google credential is required",
    });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token payload",
    });
    }

    let user = await User.findOne({ email: payload.email }).populate('role');

    if (!user) {
      // User doesn't exist - return user info for confirmation
      return res.status(200).json({
        success: false,
        needsRegistration: true,
        userInfo: {
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
          given_name: payload.given_name,
          family_name: payload.family_name
        },
        message: "Account not found. Please confirm registration.",
      });
    }

    if (unavailable(user)) return res.status(403).json({ success: false, message: 'Account unavailable.' });

    // Update profile picture and Google ID if it's missing or different from Google
    if (payload.picture && (!user.profilePicture || user.profilePicture !== payload.picture)) {
      user.profilePicture = payload.picture;
      user.googleId = payload.sub;
      user.isGoogleUser = true;
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role?.name || 'guest',
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid Google authentication. Please try again.",
    });
  }
});

// @route POST /api/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, password, profilePicture } = req.body;
  const email = normalizeEmail(req.body.email);

  // Validate required fields
  if (![fullname, username, email, password].every(value => typeof value === "string" && value.length > 0)) {
    return res.status(400).json({
      success: false,
      message: "Full name, username, email, and password are required",
    });
  }

  const passwordErrors = validatePasswordStrength(password);
  if (passwordErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: passwordErrors.join("; "),
    });
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: "This email is already registered. Please log in.",
    });
  }

  try {
    // Get or create guest role
    let guestRole = await Role.findOne({ name: 'guest' });
    if (!guestRole) {
      guestRole = await Role.create({ name: 'guest' });
    }

    const userData = { 
      fullname, 
      username, 
      email, 
      password,
      role: guestRole._id
    };
    
    // Add profilePicture if provided
    if (profilePicture) {
      userData.profilePicture = profilePicture;
    }
    
    const user = await User.create(userData);

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: `🎉 Welcome to StayHaven, ${username}! 🚀`,
      text: `
Hello ${username} 🌟,

Welcome to StayHaven! We're excited to have you here. 🎈
Your account has been successfully created with the email: ${email}.

Start exploring now: ${process.env.CLIENT_URL}/login

If you need any assistance, reach out to us at ${process.env.SUPPORT_EMAIL}. 💌

Cheers,
The StayHaven Team 🌱
      `,
    };

    let emailResult = { success: true, message: "Email sent successfully" };
    try {
      emailResult = await sendEmail(mailOptions);
      if (!emailResult.success) {
        console.warn("⚠️ Welcome email failed to send, but user was created");
      }
    } catch (error) {
      console.warn("⚠️ Welcome email failed to send:", error.message);
      // Don't fail registration if welcome email fails—user is already created
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      emailStatus: emailResult.message,
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please log in.",
      });
    }
    console.error("Registration error:", error);
    throw error;
  }
});

// @route POST /api/auth/sendSignupOtp
export const sendSignupOtp = asyncHandler(async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body is empty or invalid. Please check again.",
    });
  }

  const email = normalizeEmail(req.body.email);
  const signupFormData = req.body.signupFormData;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  if (!signupFormData) {
    return res.status(400).json({
      success: false,
      message: "Signup form data is required.",
    });
  }

  if (!signupFormData.password) {
    return res.status(400).json({
      success: false,
      message: "Password is required in signup form data.",
    });
  }

  const signupPasswordErrors = validatePasswordStrength(signupFormData.password);
  if (signupPasswordErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: signupPasswordErrors.join("; "),
    });
  }

  // Check if user already exists and is verified
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "This email is already registered. Please log in.",
    });
  }

  // Generate OTP
  const otp = generateOTP();

  // Development: Log OTP to console so you can test without email working
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n🔐 SIGNUP OTP for ${email}: ${otp}\n`);
  }

  // Invalidate any existing OTPs for this email
  await OTP.invalidateExisting(email, "signup");

  // Store OTP in MongoDB with hashed password
  await OTP.create({
    email,
    otp,
    type: "signup",
    signupFormData: {
      fullName: signupFormData.fullName || signupFormData.fullname,
      fullname: signupFormData.fullname || signupFormData.fullName,
      username: signupFormData.username,
      password: signupFormData.password, // Will be hashed by pre-save hook
    },
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  });

  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: `🔐 StayHaven Signup OTP - Verify Your Email 🛡️`,
    text: `
Hello ${signupFormData.fullName || signupFormData.fullname} 👋,

Welcome to StayHaven! 🎉

Your OTP for email verification is: ${otp}

This OTP is valid for the next 15 minutes. ⏰
If you didn't request this registration, please ignore this email.

Best regards,
The StayHaven Team 🌟
    `,
  };

  try {
    await sendEmail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email successfully.",
      userId: email, // Return email as identifier
    });
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error.message);

    // In development SMTP is frequently unconfigured or the app password has
    // been revoked. The OTP was already logged to the server console above, so
    // keep the pending record and let signup continue instead of dead-ending
    // local testing. The OTP is never put in the response body — it has to be
    // read from the server log, so this does not weaken OTP verification.
    if (process.env.NODE_ENV === "development") {
      return res.status(200).json({
        success: true,
        emailDelivered: false,
        message:
          "Email delivery failed. Read your OTP from the backend server console (development only).",
        userId: email,
      });
    }

    // Production: drop the pending OTP so no unusable record is left behind.
    await OTP.invalidateExisting(email, "signup");
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP email. Please check your email address and try again.",
    });
  }
});

// @route POST /api/auth/verifySignupOtp
export const verifySignupOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body; // userId is actually email

  if (typeof userId !== "string" || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  const email = userId.toLowerCase().trim();

  // Find valid OTP in database
  const otpRecord = await OTP.findValidOTP(email, otp, "signup");

  if (!otpRecord) {
    return res.status(404).json({
      success: false,
      message: "OTP expired or not found. Please request a new OTP.",
    });
  }

  // Check if max attempts exceeded (5 attempts)
  if (otpRecord.attempts >= 5) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return res.status(400).json({
      success: false,
      message: "Too many failed attempts. Please request a new OTP.",
    });
  }

  // Check if OTP matches
  if (otpRecord.otp !== otp) {
    await otpRecord.incrementAttempts();
    return res.status(400).json({
      success: false,
      message: "Invalid OTP. Please try again.",
    });
  }

  // Claim the code atomically so concurrent verifications cannot reuse it.
  const claimedSignup = await OTP.findOneAndUpdate({ _id: otpRecord._id, isVerified: false, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } }, { $set: { isVerified: true, verifiedAt: new Date() } });
  if (!claimedSignup) return res.status(400).json({ success: false, message: 'OTP already used. Request a new code.' });
  const { signupFormData } = otpRecord;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userId });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please log in.",
      });
    }

    // Get or create guest role
    let guestRole = await Role.findOne({ name: 'guest' });
    if (!guestRole) {
      guestRole = await Role.create({ name: 'guest' });
    }

    // Create new user
    const newUser = new User({
      fullname: signupFormData.fullName || signupFormData.fullname,
      username: signupFormData.username,
      email,
      password: signupFormData.password, // Already hashed from OTP record
      role: guestRole._id,
    });

    newUser.$locals.passwordAlreadyHashed = true;
    await newUser.save();

    // Clean up OTP record from database
    await OTP.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({
      success: true,
      message: "Registration successful! You can now log in.",
    });

  } catch (error) {
    console.error("❌ Error creating user:", error);
    await OTP.deleteOne({ _id: otpRecord._id });

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email or username already exists. Please try with different credentials.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create user account. Please try again.",
    });
  }
});

// @route POST /api/auth/sendResetPasswordOtp
export const sendResetPasswordOtp = asyncHandler(async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body is empty or invalid. Please check again.",
    });
  }

  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  // Generic response whether or not the account exists (M-1: no enumeration).
  const genericResponse = {
    success: true,
    message: "If an account with this email exists, an OTP has been sent.",
  };

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const otp = generateOTP();

  // Development: Log OTP to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n🔐 PASSWORD RESET OTP for ${email}: ${otp}\n`);
  }

  // Reuse the shared OTP collection (already used by signup) instead of the
  // ad-hoc user.resetOtp/resetOtpExpireAt fields, which are also written by
  // the staff and admin reset flows and can clobber each other (C-1 fix).
  await OTP.invalidateExisting(email, "password-reset");
  await OTP.create({
    email,
    otp,
    type: "password-reset",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  });

  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: user.email,
    subject: `🔒 StayHaven Password Reset OTP 🔑`,
    text: `
Hi ${user.username} 👋,

We received a request to reset your StayHaven password. 🔐
Please use the OTP below to proceed:

🔢 OTP: ${otp}

This OTP is valid for the next 15 minutes. ⏰
If you didn't request a password reset, please contact us at ${process.env.SUPPORT_EMAIL}. 🚨

Stay secure,
The StayHaven Team 🚀
    `,
  };

  try {
    await sendEmail(mailOptions);
  } catch (error) {
    console.error("❌ Failed to send password reset OTP:", error.message);

    // Same development fallback as signup: the OTP is already on the server
    // console, so let local testing continue rather than discarding it. The OTP
    // itself is never included in the response.
    if (process.env.NODE_ENV === "development") {
      return res.status(200).json({
        ...genericResponse,
        emailDelivered: false,
        message:
          "Email delivery failed. Read your OTP from the backend server console (development only).",
        userId: user._id,
      });
    }

    await OTP.invalidateExisting(email, "password-reset");
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP email. Please check your email address and try again.",
    });
  }

  // userId is only revealed once we've confirmed the account exists and the
  // OTP was sent — the frontend needs it for the next two steps.
  return res.status(200).json({ ...genericResponse, userId: user._id });
});

// @route POST /api/auth/verifyResetPasswordOtp
export const verifyResetPasswordOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  if (!validId(userId) || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: "UserId and OTP are required.",
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  const otpRecord = await OTP.findOne({
    email: user.email,
    type: "password-reset",
    isVerified: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    return res.status(400).json({
      success: false,
      message: "OTP expired or not found. Please request a new OTP.",
    });
  }

  // H-2: attempt lockout, same cap as the signup OTP flow.
  if (otpRecord.attempts >= 5) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return res.status(400).json({
      success: false,
      message: "Too many failed attempts. Please request a new OTP.",
    });
  }

  if (otpRecord.otp !== otp) {
    await otpRecord.incrementAttempts();
    return res.status(400).json({
      success: false,
      message: "Invalid OTP. Please try again.",
    });
  }

  const resetToken = generateSecureToken();
  const claimed = await OTP.findOneAndUpdate(
    { _id: otpRecord._id, isVerified: false, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } },
    { $set: { isVerified: true, verifiedAt: new Date(), resetTokenHash: hashToken(resetToken) } }
  );
  if (!claimed) return res.status(400).json({ success: false, message: 'OTP already used. Request a new code.' });
  return res.status(200).json({ success: true, resetToken, message: 'OTP verified successfully. You can now reset your password.' });
});

// @route POST /api/auth/resetPassword
export const resetPassword = asyncHandler(async (req, res) => {
  const { userId, newPassword, resetToken } = req.body;

  if (!validId(userId) || typeof newPassword !== "string" || typeof resetToken !== "string" || !/^[a-f0-9]{64}$/.test(resetToken)) {
    return res.status(400).json({
      success: false,
      message: "UserId and newPassword are required.",
    });
  }

  const resetPasswordErrors = validatePasswordStrength(newPassword);
  if (resetPasswordErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: resetPasswordErrors.join("; "),
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  // C-1: require a verified, unexpired, single-use OTP record — this is the
  // proof that verifyResetPasswordOtp actually ran and succeeded. Without
  // this check, anyone who knows a userId could reset any password.
  const verifiedOtp = await OTP.findOne({
    email: user.email,
    type: "password-reset",
    isVerified: true,
    resetTokenHash: hashToken(resetToken),
    expiresAt: { $gt: new Date() },
  });

  if (!verifiedOtp) {
    return res.status(400).json({
      success: false,
      message: "Please verify your OTP before resetting your password.",
    });
  }

  const isSamePassword = await user.matchPassword(newPassword);
  if (isSamePassword) {
    return res.status(400).json({
      success: false,
      message: "New password cannot be the same as the old password.",
    });
  }

  const consumed = await OTP.findOneAndDelete({ _id: verifiedOtp._id, resetTokenHash: hashToken(resetToken), expiresAt: { $gt: new Date() } });
  if (!consumed) return res.status(400).json({ success: false, message: 'Reset token expired or already used.' });
  user.password = newPassword;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password reset successfully.",
  });
});

// @route GET /api/auth/me
export const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('role').select('-password -resetOtp -resetOtpExpireAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      role: user.role?.name || 'guest',
      contact: user.contact,
      roomNumber: user.roomNumber,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch user data" 
    });
  }
});

// @route POST /api/auth/isAuth
export const isAuthenticated = asyncHandler(async (req, res) => {
  try {
    return res.status(200).json({ success: true, message: "User is Authenticated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route POST /api/auth/logout
export const logoutUser = asyncHandler(async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { refreshToken: null } });
    // Clear refresh token cookie if it exists
    res.cookie("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      expires: new Date(0),
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    
    // Still return success even if status update fails
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  }
});

// @route POST /api/auth/refresh
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No refresh token provided",
    });
  }

  try {
    const refreshSecret = getRefreshTokenSecret();
    if (!refreshSecret) {
      return res.status(500).json({
        success: false,
        message: "Refresh token secret is not configured",
      });
    }

    const decoded = jwt.verify(token, refreshSecret, { algorithms: ["HS256"] });

    // M-3: only a genuine refresh token may mint a new access token.
    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const user = await User.findById(decoded.id);

    if (unavailable(user) || user.refreshToken !== token) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const nextRefreshToken = generateRefreshToken(user._id);
    const rotated = await User.updateOne(
      { _id: user._id, refreshToken: token, isActive: { $ne: false }, isDeleted: { $ne: true }, accountStatus: { $ne: 'deactivated' } },
      { $set: { refreshToken: nextRefreshToken } }
    );
    if (rotated.modifiedCount !== 1) {
      return res.status(401).json({ success: false, message: 'Refresh token already used. Please sign in again.' });
    }
    res.cookie("refreshToken", nextRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    const newAccessToken = generateAccessToken(user._id);

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token.",
    });
  }
});

// @route POST /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current and new passwords are required",
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Verify current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  // Prevent re-using the same password
  const isSameAsCurrent = await user.matchPassword(newPassword);
  if (isSameAsCurrent) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from current password",
    });
  }

  // Validate new password using model helper (optional stricter rules)
  if (typeof user.validatePassword === 'function') {
    const { isValid, errors } = user.validatePassword(newPassword);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: errors.join("; ") || "New password validation failed",
      });
    }
  } else {
    const fallbackErrors = validatePasswordStrength(newPassword);
    if (fallbackErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: fallbackErrors.join("; "),
      });
    }
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

// @route POST /api/auth/google-register
export const googleRegister = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      success: false,
      message: "Google credential is required",
    });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token payload",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Account already exists. Please login instead.",
      });
    }

    // Get or create guest role
    let guestRole = await Role.findOne({ name: 'guest' });
    if (!guestRole) {
      guestRole = await Role.create({ name: 'guest' });
    }

    // Create new user with Google info
    const userData = {
      fullname: payload.name,
      username: payload.email.split('@')[0], // Use email prefix as username
      email: payload.email,
      password: crypto.randomBytes(32).toString('hex'), // Generate random password
      profilePicture: payload.picture,
      isGoogleUser: true,
      role: guestRole._id
    };

    const user = await User.create(userData);

    // Send welcome email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: payload.email,
      subject: `🎉 Welcome to StayHaven, ${payload.given_name || payload.name}! 🚀`,
      text: `
Hello ${payload.given_name || payload.name} 🌟,

Welcome to StayHaven! We're excited to have you here. 🎈
Your account has been successfully created with Google Sign-In.

Email: ${payload.email}

Start exploring now: ${process.env.CLIENT_URL}/login

If you need any assistance, reach out to us at ${process.env.SUPPORT_EMAIL}. 💌

Cheers,
The StayHaven Team 🌱
      `,
    };

    try {
      await sendEmail(mailOptions);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful with Google",
      accessToken,
      _id: user._id,
      username: user.username,
      email: user.email,
      role: 'guest',
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error("Google registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Google registration failed. Please try again.",
    });
  }
});

// Legacy register function for compatibility
export const register = registerUser;
