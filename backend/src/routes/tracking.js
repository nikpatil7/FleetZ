import express from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  updateLocation,
  getDriverLocations,
  getDriverLocationHistory,
  getDriverPath,
  getLocationsNearPoint,
  getPublicOrderTracking,
  getSessionLocations,
  getTrackingStats,
  cleanupOldLocations,
  getFleetStatus
} from '../controllers/trackingController.js';

const router = express.Router();

// Validation schemas
const updateLocationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  address: Joi.string().optional(),
  accuracy: Joi.number().min(0).max(100).optional(),
  speed: Joi.number().min(0).max(300).optional(),
  heading: Joi.number().min(0).max(360).optional(),
  altitude: Joi.number().min(-1000).max(10000).optional(),
  batteryLevel: Joi.number().min(0).max(100).optional(),
  isCharging: Joi.boolean().optional(),
  networkType: Joi.string().valid('wifi', '4g', '3g', '2g', 'unknown').optional(),
  signalStrength: Joi.number().min(-120).max(0).optional(),
  sessionId: Joi.string().optional(),
  metadata: Joi.object({
    appVersion: Joi.string().optional(),
    osVersion: Joi.string().optional(),
    deviceModel: Joi.string().optional(),
    source: Joi.string().valid('gps', 'network', 'passive', 'manual').optional()
  }).optional()
});

const getDriverLocationHistorySchema = Joi.object({
  startTime: Joi.date().optional(),
  endTime: Joi.date().optional(),
  limit: Joi.number().min(1).max(1000).optional()
});

const getDriverPathSchema = Joi.object({
  startTime: Joi.date().required(),
  endTime: Joi.date().required()
});

const getLocationsNearPointSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(0.1).max(100).optional(),
  limit: Joi.number().min(1).max(100).optional()
});

const getTrackingStatsSchema = Joi.object({
  period: Joi.string().valid('1h', '24h', '7d', '30d').optional()
});

const cleanupOldLocationsSchema = Joi.object({
  daysOld: Joi.number().min(1).max(365).optional()
});

// Routes
// @route   POST /api/tracking/location
// @desc    Update driver location
// @access  Private (Driver)
router.post('/location', authenticate, validate(updateLocationSchema), updateLocation);

// @route   GET /api/tracking/drivers
// @desc    Get driver locations
// @access  Private (Admin, Manager)
router.get('/drivers', authenticate, authorize(['admin', 'manager']), getDriverLocations);

// @route   GET /api/tracking/driver/:driverId
// @desc    Get driver location history
// @access  Private (Admin, Manager)
router.get('/driver/:driverId', authenticate, authorize(['admin', 'manager']), validate(getDriverLocationHistorySchema), getDriverLocationHistory);

// @route   GET /api/tracking/driver/:driverId/path
// @desc    Get driver path
// @access  Private (Admin, Manager)
router.get('/driver/:driverId/path', authenticate, authorize(['admin', 'manager']), validate(getDriverPathSchema), getDriverPath);

// @route   GET /api/tracking/near
// @desc    Get locations near point
// @access  Private (Admin, Manager)
router.get('/near', authenticate, authorize(['admin', 'manager']), validate(getLocationsNearPointSchema), getLocationsNearPoint);

// @route   GET /api/tracking/public/:trackingNumber
// @desc    Get public order tracking
// @access  Public
router.get('/public/:trackingNumber', getPublicOrderTracking);

// @route   GET /api/tracking/session/:sessionId
// @desc    Get session locations
// @access  Private
router.get('/session/:sessionId', authenticate, getSessionLocations);

// @route   GET /api/tracking/stats
// @desc    Get tracking statistics
// @access  Private (Admin, Manager)
router.get('/stats', authenticate, authorize(['admin', 'manager']), validate(getTrackingStatsSchema), getTrackingStats);

// @route   GET /api/tracking/fleet
// @desc    Get real-time fleet status
// @access  Private (Admin, Manager)
router.get('/fleet', authenticate, authorize(['admin', 'manager']), getFleetStatus);

// @route   DELETE /api/tracking/cleanup
// @desc    Cleanup old locations
// @access  Private (Admin)
router.delete('/cleanup', authenticate, authorize(['admin']), validate(cleanupOldLocationsSchema), cleanupOldLocations);

export default router;