import express from 'express';
import Joi from 'joi';
import { authenticate, authorize, attachUser } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getDrivers,
  getDriverStats,
  updateDriverStatus,
  updateDriverLocation,
  getUserDashboard
} from '../controllers/userController.js';

const router = express.Router();

// Validation schemas
const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'manager', 'driver').required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow('', null),
  vehicle: Joi.object({
    type: Joi.string().valid('bike', 'scooter', 'car', 'van', 'truck', 'cycle'),
    plate: Joi.string()
  }).optional(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string()
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string(),
    phone: Joi.string(),
    relationship: Joi.string()
  }).optional()
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(120).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'manager', 'driver').optional(),
  phone: Joi.string().allow('', null).optional(),
  status: Joi.string().valid('active', 'inactive', 'on_trip', 'offline').optional(),
  vehicle: Joi.object({
    type: Joi.string().valid('bike', 'scooter', 'car', 'van', 'truck', 'cycle'),
    plate: Joi.string()
  }).optional(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string()
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string(),
    phone: Joi.string(),
    relationship: Joi.string()
  }).optional(),
  preferences: Joi.object({
    notifications: Joi.object({
      email: Joi.boolean(),
      sms: Joi.boolean(),
      push: Joi.boolean()
    }),
    language: Joi.string(),
    timezone: Joi.string()
  }).optional()
});

const updateDriverStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'on_trip', 'offline').required()
});

const updateLocationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().optional()
});

// Routes
// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/', authenticate, authorize(['admin']), getUsers);

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', authenticate, attachUser, getUserDashboard);

// @route   GET /api/users/drivers
// @desc    Get drivers
// @access  Private (Admin, Manager)
router.get('/drivers', authenticate, authorize(['admin', 'manager']), getDrivers);

// @route   GET /api/users/drivers/stats
// @desc    Get driver statistics
// @access  Private (Admin, Manager)
router.get('/drivers/stats', authenticate, authorize(['admin', 'manager']), getDriverStats);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin)
router.get('/:id', authenticate, authorize(['admin']), getUserById);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin)
router.post('/', authenticate, authorize(['admin']), validate(createUserSchema), createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/:id', authenticate, authorize(['admin']), validate(updateUserSchema), updateUser);

// @route   PUT /api/users/:id/status
// @desc    Update driver status
// @access  Private (Admin, Manager)
router.put('/:id/status', authenticate, authorize(['admin', 'manager']), validate(updateDriverStatusSchema), updateDriverStatus);

// @route   PUT /api/users/:id/location
// @desc    Update driver location
// @access  Private (Driver)
router.put('/:id/location', authenticate, validate(updateLocationSchema), updateDriverLocation);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize(['admin']), deleteUser);

export default router;

