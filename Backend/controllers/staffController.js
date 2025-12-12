import { User } from "../models/user.schema.js";
import { Role } from "../models/role.schema.js";
import { Hotel } from "../models/hotel.schema.js";
// import { Company } from "../models/company.schema.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  hashToken,
} from "../utils/tokenUtils.js";
import { validatePasswordStrength } from "../utils/passwordValidation.js";
import { transporter } from "../config/nodemailer.js";
// import { JWT } from "google-auth-library";

const getStaffInviteEmailTemplate = ({
  staffName,
  managerName,
  propertyName,
  role,
  inviteLink,
  expiresIn,
}) => {
  // Ensure role is displayed properly
  const roleDisplay = String(role || 'Staff Member');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to ${propertyName}!</h1>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">You've been invited to join our team</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi <strong style="color: #1f2937;">${staffName}</strong>,</p>
                  
                  <p style="margin: 0 0 25px; font-size: 16px; color: #374151; line-height: 1.6;">
                    <strong style="color: #667eea;">${managerName}</strong> has invited you to join 
                    <strong style="color: #1f2937;">${propertyName}</strong> as a 
                    <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">${roleDisplay}</span>
                  </p>
                  
                  <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">Click the button below to set up your account and get started:</p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center">
                        <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">Accept Invitation & Set Up Account</a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Warning Box -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                    <tr>
                      <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px 20px;">
                        <p style="margin: 0; font-size: 14px; color: #92400e;">
                          <strong>⏰ Important:</strong> This invitation expires in <strong>${expiresIn}</strong>. Please complete your registration before then.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">If you didn't expect this invitation, you can safely ignore this email.</p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 5px; font-size: 14px; color: #374151; font-weight: 500;">Best regards,</p>
                  <p style="margin: 0; font-size: 14px; color: #667eea; font-weight: 600;">The ${propertyName} Team</p>
                  <p style="margin: 15px 0 0; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply to this email.</p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const staffLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  // Find user with role
  const user = await User.findOne({ email: email.toLowerCase() })
    .populate("role")
    .populate("company")
    .populate("assignedProperties");

  // console.log("🔍 DEBUG - User found:", user ? "Yes" : "No");
  // console.log("🔍 DEBUG - User role object:", user?.role);
  // console.log("🔍 DEBUG - User companyRole:", user?.companyRole);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Check if user has a staff role
  // Use companyRole as fallback if role.name is not available
  const allowedRoles = ["chief", "waiter", "manager", "admin", "owner", "receptionist"];
  const userRoleName = user.role?.name || user.companyRole;

  console.log("🔍 DEBUG - Role name being checked:", userRoleName);

  // Make role check case-insensitive
  const isAllowedRole = userRoleName && allowedRoles.some(role => role.toLowerCase() === userRoleName.toLowerCase());

  if (!isAllowedRole) {
    // console.log("❌ Access denied. User role:", userRoleName, "| Allowed roles:", allowedRoles);
    return res.status(403).json({
      success: false,
      message: "Access denied. Staff account required.",
    });
  }

  // console.log("✅ Role check passed for:", userRoleName);

  // Check if user is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: "Account is deactivated. Contact your manager.",
    });
  }

  // Check if user belongs to a company
  if (!user.company) {
    return res.status(403).json({
      success: false,
      message: "No company assigned. Contact your administrator.",
    });
  }

  // Check if user has assigned properties (hotel)
  if (!user.assignedProperties || user.assignedProperties.length === 0) {
    return res.status(403).json({
      success: false,
      message: "No property assigned. Contact your manager.",
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Set access token cookie
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Set refresh token cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Save refresh token to database (for rotation)
  user.refreshToken = refreshToken;
  await user.save();

  // Determine redirect path based on role
  let redirectPath = "/";
  switch (user.role.name) {
    case "chief":
      redirectPath = "/kitchen-dashboard";
      break;
    case "waiter":
      redirectPath = "/waiter-dashboard";
      break;
    case "manager":
      redirectPath = "/manager-dashboard";
      break;
    case "receptionist":
      redirectPath = "/reception-dashboard";
      break;
    default:
      redirectPath = "/dashboard";
  }

  return res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    user: {
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      role: user.role.name,
      company: {
        _id: user.company._id,
        name: user.company.name,
      },
      assignedProperties: user.assignedProperties.map((prop) => ({
        _id: prop._id,
        name: prop.name,
      })),
      // Current active property (first one or selected)
      activeProperty: user.assignedProperties[0]
        ? {
          _id: user.assignedProperties[0]._id,
          name: user.assignedProperties[0].name,
        }
        : null,
    },
    redirectPath,
  });
});

export const getStaffProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("role")
    .populate("company")
    .populate("assignedProperties")
    .select("-password -resetOtp -resetOtpExpireAt");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      role: user.role?.name,
      company: user.company
        ? {
          _id: user.company._id,
          name: user.company.name,
        }
        : null,
      assignedProperties:
        user.assignedProperties?.map((prop) => ({
          _id: prop._id,
          name: prop.name,
        })) || [],
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
});

export const registerStaff = asyncHandler(async (req, res) => {
  const { fullname, username, email, password, role, propertyId } = req.body;

  // Validate required fields
  if (!fullname || !username || !email || !password || !role || !propertyId) {
    return res.status(400).json({
      success: false,
      message:
        "All fields are required: fullname, username, email, password, role, propertyId",
    });
  }

  // Check if registering user has permission (must be manager, admin, or owner)
  const allowedToRegister = ["manager", "admin", "owner"];
  if (!allowedToRegister.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Only managers, admins, or owners can register staff",
    });
  }

  // Validate role
  const allowedRoles = ["chief", "waiter", "receptionist"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role. Allowed roles: ${allowedRoles.join(", ")}`,
    });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already registered",
    });
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return res.status(400).json({
      success: false,
      message: "Username already taken",
    });
  }

  // Verify property exists and belongs to the same company
  const property = await Hotel.findById(propertyId);
  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found",
    });
  }

  // Check if property belongs to the same company as the registering user
  if (property.company.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "Property does not belong to your company",
    });
  }

  // Get or create the role
  let staffRole = await Role.findOne({ name: role });
  if (!staffRole) {
    staffRole = await Role.create({ name: role });
  }

  // Create new staff user
  const newStaff = await User.create({
    fullname,
    username,
    email: email.toLowerCase(),
    password,
    role: staffRole._id,
    company: req.user.company,
    companyRole: role,
    assignedProperties: [propertyId],
    isActive: true,
  });

  return res.status(201).json({
    success: true,
    message: `${role.charAt(0).toUpperCase() + role.slice(1)
      } staff registered successfully`,
    staff: {
      _id: newStaff._id,
      fullname: newStaff.fullname,
      username: newStaff.username,
      email: newStaff.email,
      role: role,
      assignedProperty: property.name,
    },
  });
});

export const getPropertyStaff = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  // Check if user has permission
  const allowedRoles = ["manager", "admin", "owner"];
  if (!allowedRoles.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Verify property belongs to user's company
  const property = await Hotel.findById(propertyId);
  if (
    !property ||
    property.company.toString() !== req.user.company.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "Property not found or access denied",
    });
  }

  // Get all staff assigned to this property
  const staff = await User.find({
    assignedProperties: propertyId,
    company: req.user.company,
  })
    .populate("role")
    .select("-password -resetOtp -resetOtpExpireAt");

  return res.status(200).json({
    success: true,
    count: staff.length,
    staff: staff.map((s) => ({
      _id: s._id,
      fullname: s.fullname,
      username: s.username,
      email: s.email,
      role: s.role?.name,
      isActive: s.isActive,
      createdAt: s.createdAt,
    })),
  });
});

export const updateStaffStatus = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { isActive } = req.body;

  // Check if user has permission
  const allowedRoles = ["manager", "admin", "owner"];
  if (!allowedRoles.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Find staff member
  const staff = await User.findById(staffId).populate("role");
  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff member not found",
    });
  }

  // Check if staff belongs to same company
  if (staff.company.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  // Update status
  staff.isActive = isActive;
  await staff.save();

  return res.status(200).json({
    success: true,
    message: `Staff ${isActive ? "activated" : "deactivated"} successfully`,
    staff: {
      _id: staff._id,
      fullname: staff.fullname,
      isActive: staff.isActive,
    },
  });
});

export const staffLogout = asyncHandler(async (req, res) => {
  if (req.user) {
    // clear refresh token in db
    await User.findByIdAndUpdate(req.user._id, {
      refreshToken: null,
    });
  }
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
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "No Refresh Token Provided",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Refresh Token",
    });
  }

  const user = await User.findById(decoded.id);
  if (!user || user.refreshToken !== refreshToken) {
    // token reused detected! so invalidate all token for this user
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    return res.status(401).json({
      success: false,
      message: "Invalid Refresh Token. Please Login Again",
    });
  }

  // generate new tokens
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  // save new refresh token to db
  user.refreshToken = newRefreshToken;
  await user.save();

  // set new cookies
  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 15 * 60 * 1000, // 15 mins in milliseconds
  });

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, //7 days in milliseconds
  });

  // return success response with new accessToken
  return res.status(200).json({
    success: true,
    message: "Tokens refresh successfully!",
    accessToken: newAccessToken,
  });
});

export const inviteStaff = asyncHandler(async (req, res) => {
  const { fullname, email, role, propertyId } = req.body;

  // validate if all data is provided
  if (!fullname || !email || !role || !propertyId) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  const allowedToInvite = ["manager", "admin", "owner"];
  if (!req.user.role || !allowedToInvite.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Only manager, admins or owners can invite staff",
    });
  }

  // check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    // if user exists but invite expired, allow re-invite
    if (
      existingUser.accountStatus === "invited" &&
      existingUser.inviteTokenExpireAt < new Date()
    ) {
      // proceed to send invite again
    } else {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }
  }

  // only allow valid staff roles
  const allowedRoles = ["chief", "waiter", "receptionist"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid Role. Allowed ${allowedRoles.join(", ")}`,
    });
  }

  // check if property exists and belongs to the company
  const property = await Hotel.findById(propertyId);
  if (!property) {
    return res.status(400).json({
      success: false,
      message: "Property Not Found!",
    });
  }

  if (property.company.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "You can only invite staff for your own company's properties ",
    });
  }

  // generate secure invite token
  const inviteToken = generateSecureToken();
  const hashedToken = hashToken(inviteToken);

  // token expires in 2 days
  const inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // get or create role
  let staffRole = await Role.findOne({ name: role });
  if (!staffRole) {
    staffRole = await Role.create({ name: role });
  }

  // create or update user
  let newStaff;

  if (existingUser && existingUser.accountStatus === "invited") {
    // update existing invited user (re-invite user)
    existingUser.fullname = fullname;
    existingUser.role = staffRole._id;
    existingUser.companyRole = role; // Store role name string (chief, waiter, etc.)
    existingUser.inviteToken = hashedToken;
    existingUser.inviteTokenExpireAt = inviteExpires;
    existingUser.invitedAt = new Date();
    existingUser.createdBy = req.user._id;
    await existingUser.save();
    newStaff = existingUser;
  } else {
    newStaff = await User.create({
      fullname,
      username: email.split("@")[0] + "_" + Date.now(), //temp username
      email: email.toLowerCase(),
      password: generateSecureToken(),
      role: staffRole._id,
      companyRole: role, // Store role name string (chief, waiter, etc.)
      company: req.user.company,
      assignedProperties: [propertyId],
      isActive: false, // cant login yet
      isEmailVerified: false,
      accountStatus: "invited",
      inviteToken: hashedToken,
      inviteTokenExpireAt: inviteExpires,
      invitedAt: new Date(),
      createdBy: req.user._id,
    });
  }

  // build invite link
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const inviteLink = `${frontendUrl}/staff/onboard?token=${inviteToken}`;

  // send invite email
  const managerName = req.user.fullname || "Your Manager";
  const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
  console.log("📧 Sending invite email with role:", roleCapitalized);

  const emailTemplate = getStaffInviteEmailTemplate({
    staffName: fullname,
    managerName: managerName,
    propertyName: property.name,
    role: roleCapitalized,
    inviteLink: inviteLink,
    expiresIn: "48 hours",
  });

  try {
    await transporter.sendMail({
      from: `"${property.name} via StayHaven" <${process.env.SENDER_EMAIL}>`,
      replyTo: property.contact?.email || process.env.SENDER_EMAIL,
      to: email,
      subject: `You're Invited to Join as ${role.charAt(0).toUpperCase() + role.slice(1)
        } at ${property.name}`,
      html: emailTemplate,
    });
  } catch (emailError) {
    console.error("Failed to send invite email:", emailError);
  }

  return res.status(200).json({
    success: true,
    message: `Invitaton Sent Successfully to ${email}`,
    staff: {
      _id: newStaff._id,
      fullname: newStaff.fullname,
      email: newStaff.email,
      role: role,
      propertyName: property.name,
      accountStatus: newStaff.accountStatus,
      invitedAt: newStaff.invitedAt,
    },
  });
});

export const verifyInviteToken = asyncHandler(async (req, res) => {
  // get token from url params
  const { token } = req.params;

  // validate if token is provided or not
  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Invite token missing!",
    });
  }

  // hash the token to compare with db
  const hashedToken = hashToken(token);

  // find user with matching token and 'invited' status
  const user = await User.findOne({
    inviteToken: hashedToken,
    accountStatus: 'invited',
  })
    .populate('role', 'name')  // get role name
    .populate('company', 'name') // get company name
    .populate('assignedProperties', 'name'); // get Property name

  // check if user found
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or already used invite link",
    });
  }
  // check if token has been expired or not
  if (user.inviteTokenExpireAt < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Invite link has been expired. please ask your manager for a new one",
      expired: true, // frontend can show "Request new invite" button
    })
  }

  // token is valid now it can return info for onboarding form
  return res.status(200).json({
    success: true,
    message: "Invite token is valid",
    user: {
      fullname: user.fullname,
      email: user.email,
      role: user.role?.name || user.companyRole,
      company: user.company?.name,
      assignedProperties: user.assignedProperties?.map(prop => ({
        _id: prop._id,
        name: prop.name,
      })) || [],
    },
  });
});


export const completeOnBoarding = asyncHandler(async (req, res) => {

  // extract data from body
  const { token, password, username } = req.body;

  // validate required fields
  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: "Token and password are required",
    });
  }


  // Validate password strength
  const passwordErrors = validatePasswordStrength(password);

  // return all errors at once if exists
  if (passwordErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Password does not meet strength requirement",
      errors: passwordErrors,
    });
  }

  // find user by hashed Token
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    inviteToken: hashedToken,
    accountStatus: 'invited',
  })
    .populate('role', 'name')
    .populate('company', 'name')
    .populate('assignedProperties', 'name');

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or already used invite link",
    });
  }

  // check token expiration
  if (user.inviteTokenExpireAt < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Invite link has been expired. please ask your manager for a new one",
      expired: true,
    });
  }

  // check if username is taken 
  if (username) {
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: user._id }, // exclude this user
    })

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username is already taken",
      });
    }

    user.username = username.toLowerCase();
  }

  // activate this account
  user.password = password;

  // clear the invite token- single use only
  user.inviteToken = null;
  user.inviteTokenExpireAt = null;

  // Change status from 'invited' to 'active'
  user.accountStatus = 'active';

  // Enable login
  user.isActive = true;
  user.isEmailVerified = true;

  user.onboardedAt = new Date(); // record when onboarding was completed

  await user.save(); // save all changes to db

  res.status(200).json({
    success: true,
    message: "Onboarding completed successfully",
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      username: user.username,
      role: user.role?.name || user.companyRole,
      company: user.company?.name,
      assignedProperties: user.assignedProperties?.map(prop => ({
        _id: prop._id,
        name: prop.name,
      })) || [],
    },
  });
});


//  Resend invite email to staff with expired token
export const resendInvite = asyncHandler(async (req, res) => {
  // Get staff ID from URL parameter
  const { staffId } = req.params;

  // Only managers/admins/owners can resend invites
  const allowedRoles = ['manager', 'admin', 'owner'];
  if (!req.user.role || !allowedRoles.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to resend invites",
    });
  }

  //  Find the staff member
  const staff = await User.findById(staffId)
    .populate('assignedProperties', 'name contact')
    .populate('company', 'name');

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff member not found",
    });
  }

  // Manager from Company A can't resend invite for Company B staff
  if (staff.company._id.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to manage this staff member",
    });
  }

  //  Check status - can only resend for 'invited' accounts
  // If status is 'active', they already onboarded - no need to resend
  if (staff.accountStatus !== 'invited') {
    return res.status(400).json({
      success: false,
      message: "Can only resend invites for pending invitations",
    });
  }

  // Generate NEW token (old one is invalidated)
  const newToken = generateSecureToken();
  const hashedToken = hashToken(newToken);
  const newExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  //  Update staff with new token
  staff.inviteToken = hashedToken;
  staff.inviteTokenExpireAt = newExpires;
  staff.invitedAt = new Date();
  await staff.save();

  // Build invite link and send email
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const inviteLink = `${frontendUrl}/staff/onboard?token=${newToken}`;

  const property = staff.assignedProperties[0];
  const emailTemplate = getStaffInviteEmailTemplate({
    staffName: staff.fullname,
    managerName: req.user.fullname || 'Your Manager',
    propertyName: property?.name || 'Property',
    role: staff.companyRole?.charAt(0).toUpperCase() + staff.companyRole?.slice(1),
    inviteLink: inviteLink,
    expiresIn: '48 hours',
  });

  try {
    await transporter.sendMail({
      from: `"${property?.name || 'StayHaven'} via StayHaven" <${process.env.SENDER_EMAIL}>`,
      replyTo: property?.contact?.email,
      to: staff.email,
      subject: `[Reminder] You're invited to join as ${staff.companyRole}`,
      html: emailTemplate,
    });
  } catch (emailError) {
    console.error("Failed to resend invite email:", emailError);
  }

  //  Return success
  return res.status(200).json({
    success: true,
    message: `New invite sent to ${staff.email}`,
    staff: {
      _id: staff._id,
      fullname: staff.fullname,
      email: staff.email,
      invitedAt: staff.invitedAt,
    },
  });
});

//  Get all pending invitations for manager's company
export const getPendingInvites = asyncHandler(async (req, res) => {
  //  Authorization check
  const allowedRoles = ['manager', 'admin', 'owner'];
  if (!req.user.role || !allowedRoles.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized",
    });
  }

  //Get all pending invites for this company
  const pendingInvites = await User.find({
    company: req.user.company,
    accountStatus: 'invited',
  })
    .populate('assignedProperties', 'name')
    .populate('createdBy', 'fullname')  // Who invited them
    .select('fullname email companyRole assignedProperties invitedAt inviteTokenExpireAt createdBy')
    .sort({ invitedAt: -1 });  // Newest first

  //  Format and return response
  return res.status(200).json({
    success: true,
    count: pendingInvites.length,
    invites: pendingInvites.map(invite => ({
      _id: invite._id,
      fullname: invite.fullname,
      email: invite.email,
      role: invite.companyRole,
      assignedProperties: invite.assignedProperties,
      invitedAt: invite.invitedAt,
      expiresAt: invite.inviteTokenExpireAt,
      isExpired: invite.inviteTokenExpireAt < new Date(),  // true/false
      invitedBy: invite.createdBy?.fullname || 'Unknown',
    })),
  });
});


// delete/cancel a pending staff invite
export const deleteInvite = asyncHandler(async (req, res) => {
  const { staffId } = req.params;

  // Check permissions - consistent with other functions
  const allowedRoles = ['manager', 'admin', 'owner'];
  if (!req.user.role || !allowedRoles.includes(req.user.role.name)) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete invite",
    });
  }

  const staff = await User.findById(staffId);
  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff invite not found"
    });
  }

  // Security: Verify staff belongs to the same company (multi-tenant isolation)
  if (staff.company.toString() !== req.user.company.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to manage this staff member",
    });
  }

  // Verify it's a pending invite (not yet onboarded)
  if (staff.accountStatus !== "invited") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete invite for staff who have been already onboarded"
    });
  }

  await User.findByIdAndDelete(staffId);
  res.status(200).json({
    success: true,
    message: "Invite deleted successfully"
  });
});

export const changePassword = asyncHandler(async (req, res) => {

  // extracting currentpassword and password from frontend request body
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current Password and New Password are required"
    });
  }

  // find logged-in user 
  const user = req.user._id;
  const currentUser = await User.findById(user).select("+password");

  if (!currentUser) {
    return res.status(404).json({
      success: false,
      message: "User not found!"
    });
  }

  const isMatch = await currentUser.matchPassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Current Password is incorrect",
    });
  }

  // Check if new password is same as current password
  if (currentPassword === newPassword) {
    return res.status(400).json({
      success: false,
      message: "New password cannot be the same as current password",
    });
  }

  // Validate password strength
  const passErrs = validatePasswordStrength(newPassword);

  if (passErrs.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Password does not meet strength requirements",
      errors: passErrs,
    });
  }

  currentUser.password = newPassword;

  // Invalidate all existing refresh tokens for security
  // Forces re-login on other devices after password change
  currentUser.refreshToken = null;

  await currentUser.save();

  return res.status(200).json({
    success: true,
    message: "Password Changed Successfully.",
  });
});


export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required!",
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).populate('role').populate('assignedProperties', "name");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User with this email not found!",
    });
  }

  const staffRoles = ['chief', 'manager', 'waiter', 'receptionist', 'admin', 'owner'];
  const userRole = (user.role?.name || user.companyRole).toLowerCase();

  if (!userRole || !staffRoles.includes(userRole)) {
    return res.status(404).json({
      success: false,
      message: "User with this email and role not found!",
    })
  }

  // generate a secure random token 
  const resetToken = generateSecureToken();

  // Hashing the token before storing in db
  const hashedToken = hashToken(resetToken);

  //token expires in 1 hr shorter than invite(for security purpose)
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

  // Save hashed token and expiry to user document
  user.resetOtp = hashedToken;
  user.resetOtpExpireAt = resetExpires;
  await user.save();

  // build reset link and send email
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const resetLink = `${frontendUrl}/staff/reset-password?token=${resetToken}`;

  // Get property name for email branding
  const propertyName = user.assignedProperties?.[0]?.name || "StayHaven";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🔐 Password Reset</h1>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Reset your account password</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi <strong style="color: #1f2937;">${user.fullname}</strong>,</p>
                  
                  <p style="margin: 0 0 25px; font-size: 16px; color: #374151; line-height: 1.6;">
                    We received a request to reset your password for your staff account at 
                    <strong style="color: #667eea;">${propertyName}</strong>.
                  </p>
                  
                  <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">Click the button below to set a new password:</p>
                  
                  <!-- CTA Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center">
                        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Warning Box -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                    <tr>
                      <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px 20px;">
                        <p style="margin: 0; font-size: 14px; color: #92400e;">
                          <strong>⏰ Important:</strong> This link expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
                  <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af; word-break: break-all;">${resetLink}</p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 5px; font-size: 14px; color: #374151; font-weight: 500;">Best regards,</p>
                  <p style="margin: 0; font-size: 14px; color: #667eea; font-weight: 600;">The ${propertyName} Team</p>
                  <p style="margin: 15px 0 0; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply to this email.</p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"${propertyName}" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: emailHtml,
    });
  } catch (emailError) {
    console.error("Failed to send reset email:", emailError);
  }

  return res.status(200).json({
    success: true,
    message: "If this email exists, a reset link has been sent",
  });
});


// Reset Password - Complete the password reset with token
export const resetPassword = asyncHandler(async (req, res) => {
  //Extract token and newPassword from request body
  const { token, newPassword } = req.body;

  // Validate required fields
  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Token and new password are required",
    });
  }

  // Validate password strength
  const passwordErrors = validatePasswordStrength(newPassword);

  // Return all errors if password is weak
  if (passwordErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Password does not meet strength requirements",
      errors: passwordErrors,
    });
  }

  //  Hash the token to compare with database
  const hashedToken = hashToken(token);

  // Find user with matching token that hasn't expired
  const user = await User.findOne({
    resetOtp: hashedToken,
    resetOtpExpireAt: { $gt: new Date() }, // Token must not be expired
  });

  // Check if user found (invalid or expired token)
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token. Please request a new reset link.",
    });
  }

  // Set new password - pre-save hook will hash it
  user.password = newPassword;

  // Clear the reset token fields - single use only
  user.resetOtp = null;
  user.resetOtpExpireAt = null;

  // Invalidate all refresh tokens for security
  user.refreshToken = null;

  // Save changes to database
  await user.save();

  // Return success response
  return res.status(200).json({
    success: true,
    message: "Password reset successfully. You can now login with your new password.",
  });
});