import express from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getDashboardAnalytics,
  getOrderAnalytics,
  getDriverAnalytics,
  getRevenueAnalytics,
  getPerformanceTrends
} from '../controllers/analyticsController.js';

const router = express.Router();

// Validation schemas
const getDashboardAnalyticsSchema = Joi.object({
  period: Joi.string().valid('1h', '24h', '7d', '30d').optional()
});

const getOrderAnalyticsSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  groupBy: Joi.string().valid('hour', 'day', 'week', 'month').optional()
});

const getDriverAnalyticsSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  limit: Joi.number().min(1).max(100).optional()
});

const getRevenueAnalyticsSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  groupBy: Joi.string().valid('hour', 'day', 'week', 'month').optional()
});

const getPerformanceTrendsSchema = Joi.object({
  period: Joi.string().valid('24h', '7d', '30d').optional()
});

// Routes
// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private (Admin, Manager)
router.get('/dashboard', authenticate, authorize(['admin', 'manager']), validate(getDashboardAnalyticsSchema), getDashboardAnalytics);

// @route   GET /api/analytics/orders
// @desc    Get order analytics
// @access  Private (Admin, Manager)
router.get('/orders', authenticate, authorize(['admin', 'manager']), validate(getOrderAnalyticsSchema), getOrderAnalytics);

// @route   GET /api/analytics/drivers
// @desc    Get driver performance analytics
// @access  Private (Admin, Manager)
router.get('/drivers', authenticate, authorize(['admin', 'manager']), validate(getDriverAnalyticsSchema), getDriverAnalytics);

// @route   GET /api/analytics/revenue
// @desc    Get revenue analytics
// @access  Private (Admin, Manager)
router.get('/revenue', authenticate, authorize(['admin', 'manager']), validate(getRevenueAnalyticsSchema), getRevenueAnalytics);

// @route   GET /api/analytics/trends
// @desc    Get performance trends
// @access  Private (Admin, Manager)
router.get('/trends', authenticate, authorize(['admin', 'manager']), validate(getPerformanceTrendsSchema), getPerformanceTrends);

export default router;