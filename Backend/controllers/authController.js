import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendEmail } from "../config/nodemailer.js";
import { generateAccessToken, generateRefreshToken, generateOTP } from "../utils/tokenUtils.js";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @route GET /api/auth/check
export const checkUserExists = asyncHandler(async (req, res) => {
  const { email } = req.query;
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
  const { email, password } = req.body;

  const user = await User.findOne({ email }).populate('role');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Email is not registered. Please register first.",
    });
  }

  if (!(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials. Please try again.",
    });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

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

    if (!payload || !payload.email) {
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

    // Update profile picture if it's missing or different from Google
    if (payload.picture && (!user.profilePicture || user.profilePicture !== payload.picture)) {
      user.profilePicture = payload.picture;
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

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
  const { fullname, username, email, password, profilePicture } = req.body;

  // Validate required fields
  if (!fullname || !username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Full name, username, email, and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
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

    const emailResult = await sendEmail(mailOptions);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

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

  const email = req.body.email?.toLowerCase().trim();
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

  // Check if user already exists and is verified
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "This email is already registered. Please log in.",
    });
  }

  // Generate OTP - simple approach
  const otp = generateOTP();
  
  // Store signup data in simple memory cache (will work for single server)
  global.signupOtpCache = global.signupOtpCache || {};
  global.signupOtpCache[email] = {
    otp: otp,
    signupFormData: signupFormData,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    createdAt: Date.now()
  };

  console.log("💾 Storing signup OTP in memory:", {
    email,
    otp,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
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
      userId: email // Return email as identifier
    });
  } catch (error) {
    // Clean up temp data if email fails
    delete global.signupOtpCache[email];
    console.error("❌ Failed to send OTP email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP email. Please try again later.",
    });
  }
});

// @route POST /api/auth/verifySignupOtp
export const verifySignupOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body; // userId is actually email

  if (!userId || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  // Check if OTP exists in memory cache
  global.signupOtpCache = global.signupOtpCache || {};
  const cachedData = global.signupOtpCache[userId]; // userId is email

  console.log("🔍 Verifying signup OTP:", {
    email: userId,
    otp,
    cacheExists: !!cachedData,
    cachedOtp: cachedData?.otp
  });

  if (!cachedData) {
    return res.status(404).json({
      success: false,
      message: "OTP expired or not found. Please request a new OTP.",
    });
  }

  // Check if OTP has expired
  if (Date.now() > cachedData.expiresAt) {
    delete global.signupOtpCache[userId];
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please request a new one.",
    });
  }

  // Check if OTP matches
  if (cachedData.otp !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP. Please try again.",
    });
  }

  // OTP is correct! Create the user account
  const { signupFormData } = cachedData;
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userId });
    if (existingUser) {
      delete global.signupOtpCache[userId];
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
    const newUser = await User.create({
      fullname: signupFormData.fullName || signupFormData.fullname,
      username: signupFormData.username,
      email: userId,
      password: signupFormData.password,
      role: guestRole._id,
    });

    // Clean up cache
    delete global.signupOtpCache[userId];

    console.log("✅ User created successfully:", newUser.email);

    return res.status(200).json({
      success: true,
      message: "Registration successful! You can now log in.",
    });

  } catch (error) {
    console.error("❌ Error creating user:", error);
    delete global.signupOtpCache[userId];
    
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

  const email = req.body.email?.toLowerCase().trim();

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found. Please register first.",
    });
  }

  const otp = generateOTP();
  user.resetOtp = otp;
  user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 mins
  await user.save();

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
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP email. Please try again later.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "If an account with this email exists, an OTP has been sent.",
    userId: user._id,
  });
});

// @route POST /api/auth/verifyResetPasswordOtp
export const verifyResetPasswordOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) {
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

  if (user.resetOtp !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP. Please try again.",
    });
  }

  if (user.resetOtpExpireAt < Date.now()) {
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please request a new one.",
    });
  }

  user.resetOtp = "";
  user.resetOtpExpireAt = 0;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully. You can now reset your password.",
  });
});

// @route POST /api/auth/resetPassword
export const resetPassword = asyncHandler(async (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "UserId and newPassword are required.",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long.",
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  const isSamePassword = await user.matchPassword(newPassword);
  if (isSamePassword) {
    return res.status(400).json({
      success: false,
      message: "New password cannot be the same as the old password.",
    });
  }

  user.password = newPassword;
  user.resetOtp = "";
  user.resetOtpExpireAt = 0;
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
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No refresh token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const newAccessToken = generateAccessToken(user._id);

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token.",
    });
  }
});

// @route POST /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: "New password is required",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters long",
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Update password directly without current password verification
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

    if (!payload || !payload.email) {
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
