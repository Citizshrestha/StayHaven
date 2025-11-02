const User = require('../models/user.schema');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register new user
exports.registerUser = async (req, res) => {
  try {
    const { name, username, email, password, phone, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'Email already in use' });

    const newUser = await User.create({
      name,
      username,
      email,
      password,
      phone,
      role,
    });

    const token = generateToken(newUser);
    res.status(201).json({
      success: true,
      token,
      user: newUser.getPublicProfile(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');
    if (!user)
      return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid email or password' });

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get logged-in user's info
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ message: 'User not found' });

    res.json({ success: true, user: user.getPublicProfile() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
