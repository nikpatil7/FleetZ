import express from 'express';
import { authenticate, attachUser } from '../middleware/auth.js';
import {
  login,
  refreshToken,
  getMe,
  logout,
  changePassword,
  updateProfile
} from '../controllers/authController.js';

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', refreshToken);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, attachUser, getMe);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, logout);

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', authenticate, changePassword);

// @route   PUT /api/auth/profile
// @desc    Update profile
// @access  Private
router.put('/profile', authenticate, updateProfile);

export default router;

