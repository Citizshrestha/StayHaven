import { User } from '../models/user.schema.js';
import bcrypt from 'bcryptjs';
import { uploadToCloudinary, buildSuperadminProfileFolder } from '../middleware/upload.js';

/**
 * @desc    Get current user profile
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken -resetOtp -resetOtpExpireAt')
      .populate('role', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

/**
 * @desc    Update user profile (username, email, fullname)
 * @route   PATCH /api/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const { username, email, fullname } = req.body;
    const userId = req.user._id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({
        username,
        _id: { $ne: userId }
      });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Update fields
    if (username) user.username = username.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (fullname) user.fullname = fullname.trim();

    await user.save();

    // Return updated user without sensitive data
    const updatedUser = await User.findById(userId)
      .select('-password -refreshToken -resetOtp -resetOtpExpireAt')
      .populate('role', 'name');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

/**
 * @desc    Update profile picture
 * @route   PATCH /api/profile/picture
 * @access  Private
 */
export const updateProfilePicture = async (req, res) => {
  try {
    const { profilePicture } = req.body;
    const userId = req.user._id;

    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture URL is required' });
    }

    // Validate URL format (basic validation)
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(profilePicture)) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -resetOtp -resetOtpExpireAt')
     .populate('role', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ message: 'Failed to update profile picture' });
  }
};

/**
 * @desc    Upload profile picture file to Cloudinary
 * @route   POST /api/v1/profile/picture/upload
 * @access  Private
 */
export const uploadProfilePictureFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    const user = await User.findById(req.user._id).populate('role', 'name');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userRole = user.role?.name || user.companyRole;
    const uploadOptions = userRole === 'superadmin'
      ? { folder: buildSuperadminProfileFolder(user.username) }
      : {
          role: userRole || 'staff',
          fullname: user.fullname || user.username || 'unknown',
        };

    const result = await uploadToCloudinary(req.file.buffer, uploadOptions);

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { profilePicture: result.secure_url },
      { new: true, runValidators: true }
    )
      .select('-password -refreshToken -resetOtp -resetOtpExpireAt')
      .populate('role', 'name');

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: updatedUser,
      profilePicture: result.secure_url,
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload profile picture',
    });
  }
};

/**
 * @desc    Change password
 * @route   POST /api/profile/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    // Find user with password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is a Google user
    if (user.isGoogleUser) {
      return res.status(400).json({
        message: 'Cannot change password for Google authenticated accounts'
      });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Validate new password
    const validation = user.validatePassword(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Password does not meet requirements',
        errors: validation.errors
      });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: 'New password must be different from current password'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};
