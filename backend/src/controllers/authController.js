import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import httpStatus from 'http-status';
import env from '../config/env.js';

// Generate JWT tokens
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role: role },
    env.jwtSecret,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { id: userId, role: role },
    env.jwtRefreshSecret,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return errorResponse(res, 'Email and password are required', httpStatus.BAD_REQUEST);
  }

  // Check if user exists
  const user = await User.findByEmail(email);
  if (!user) {
    return errorResponse(res, 'Invalid credentials', httpStatus.UNAUTHORIZED);
  }

  // Check if user is active
  if (!user.isActive) {
    return errorResponse(res, 'Account is deactivated', httpStatus.UNAUTHORIZED);
  }

  // Verify password
  const isPasswordValid = await user.verifyPassword(password);
  if (!isPasswordValid) {
    return errorResponse(res, 'Invalid credentials', httpStatus.UNAUTHORIZED);
  }

  // Update last seen
  await user.updateLastSeen();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id, user.role);

  // Prepare user data (exclude sensitive information)
  const userData = user.toSafeObject();

  successResponse(res, {
    user: userData,
    accessToken,
    refreshToken
  }, 'Login successful', httpStatus.OK);
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return errorResponse(res, 'Refresh token is required', httpStatus.BAD_REQUEST);
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return errorResponse(res, 'Invalid refresh token', httpStatus.UNAUTHORIZED);
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      env.jwtSecret,
      { expiresIn: '15m' }
    );

    successResponse(res, { accessToken }, 'Token refreshed successfully', httpStatus.OK);
  } catch (error) {
    return errorResponse(res, 'Invalid refresh token', httpStatus.UNAUTHORIZED);
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  
  if (!user) {
    return errorResponse(res, 'User not found', httpStatus.NOT_FOUND);
  }

  successResponse(res, user.toSafeObject(), 'User retrieved successfully', httpStatus.OK);
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // In a more sophisticated setup, you might want to blacklist the token
  // For now, we'll just return a success message
  successResponse(res, null, 'Logout successful', httpStatus.OK);
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return errorResponse(res, 'Current password and new password are required', httpStatus.BAD_REQUEST);
  }

  if (newPassword.length < 6) {
    return errorResponse(res, 'New password must be at least 6 characters long', httpStatus.BAD_REQUEST);
  }

  const user = await User.findById(req.user.id);
  
  // Verify current password
  const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return errorResponse(res, 'Current password is incorrect', httpStatus.BAD_REQUEST);
  }

  // Update password
  user.passwordHash = newPassword;
  await user.save();

  successResponse(res, null, 'Password changed successfully', httpStatus.OK);
});

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address, emergencyContact, preferences } = req.body;
  
  const user = await User.findById(req.user.id);
  
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (emergencyContact) user.emergencyContact = emergencyContact;
  if (preferences) user.preferences = { ...user.preferences, ...preferences };
  
  await user.save();

  successResponse(res, user.toSafeObject(), 'Profile updated successfully', httpStatus.OK);
});