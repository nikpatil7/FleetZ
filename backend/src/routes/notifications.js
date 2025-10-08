import express from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import Notification from '../models/Notification.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import httpStatus from 'http-status';

// Validation schemas
const createNotificationSchema = Joi.object({
  recipientId: Joi.string().required(),
  type: Joi.string().valid(
    'order_assigned', 'order_status_update', 'order_delivered', 'order_cancelled',
    'driver_assigned', 'driver_location_update', 'payment_received', 'payment_failed',
    'system_alert', 'maintenance_due', 'document_expiry', 'rating_received',
    'emergency', 'general'
  ).required(),
  title: Joi.string().max(100).required(),
  message: Joi.string().max(500).required(),
  data: Joi.object({
    orderId: Joi.string().optional(),
    driverId: Joi.string().optional(),
    vehicleId: Joi.string().optional(),
    amount: Joi.number().optional(),
    location: Joi.object({
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
      address: Joi.string()
    }).optional(),
    metadata: Joi.object().optional()
  }).optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  channels: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('email', 'sms', 'push', 'in_app').required(),
      status: Joi.string().valid('pending', 'sent', 'delivered', 'failed').optional()
    })
  ).optional(),
  scheduledAt: Joi.date().optional(),
  expiresAt: Joi.date().optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional()
});

const updateNotificationSchema = Joi.object({
  status: Joi.string().valid('pending', 'sent', 'delivered', 'read', 'failed').optional(),
  isRead: Joi.boolean().optional(),
  isArchived: Joi.boolean().optional()
});

const markAsReadSchema = Joi.object({
  notificationIds: Joi.array().items(Joi.string()).optional()
});

// Controllers
// @desc    Get notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false, type } = req.query;
  const { skip, limit: limitNum } = getPagination(page, limit);

  const options = {
    recipientId: req.user.id,
    unreadOnly: unreadOnly === 'true',
    type
  };

  const notifications = await Notification.findByRecipient(req.user.id, options)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Notification.countDocuments({
    recipientId: req.user.id,
    isArchived: false,
    ...(unreadOnly === 'true' && { isRead: false }),
    ...(type && { type })
  });

  const pagination = getPaginationMeta(page, limitNum, total);

  paginatedResponse(res, notifications, pagination, 'Notifications retrieved successfully', httpStatus.OK);
});

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
export const getNotificationById = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return errorResponse(res, 'Notification not found', httpStatus.NOT_FOUND);
  }

  // Check if user can access this notification
  if (notification.recipientId.toString() !== req.user.id && req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied', httpStatus.FORBIDDEN);
  }

  successResponse(res, notification, 'Notification retrieved successfully', httpStatus.OK);
});

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private (Admin, Manager)
export const createNotification = asyncHandler(async (req, res) => {
  const {
    recipientId,
    type,
    title,
    message,
    data,
    priority = 'normal',
    channels = [{ type: 'in_app' }],
    scheduledAt,
    expiresAt,
    tags
  } = req.body;

  const notification = new Notification({
    recipientId,
    type,
    title,
    message,
    data,
    priority,
    channels,
    scheduledAt,
    expiresAt,
    tags
  });

  await notification.save();

  successResponse(res, notification, 'Notification created successfully', httpStatus.CREATED);
});

// @desc    Update notification
// @route   PUT /api/notifications/:id
// @access  Private
export const updateNotification = asyncHandler(async (req, res) => {
  const { status, isRead, isArchived } = req.body;

  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    return errorResponse(res, 'Notification not found', httpStatus.NOT_FOUND);
  }

  // Check if user can update this notification
  if (notification.recipientId.toString() !== req.user.id && req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied', httpStatus.FORBIDDEN);
  }

  if (status) notification.status = status;
  if (isRead !== undefined) {
    notification.isRead = isRead;
    if (isRead) notification.readAt = new Date();
  }
  if (isArchived !== undefined) notification.isArchived = isArchived;

  await notification.save();

  successResponse(res, notification, 'Notification updated successfully', httpStatus.OK);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return errorResponse(res, 'Notification not found', httpStatus.NOT_FOUND);
  }

  // Check if user can access this notification
  if (notification.recipientId.toString() !== req.user.id && req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied', httpStatus.FORBIDDEN);
  }

  await notification.markAsRead();

  successResponse(res, notification, 'Notification marked as read', httpStatus.OK);
});

// @desc    Mark multiple notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
export const markMultipleAsRead = asyncHandler(async (req, res) => {
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return errorResponse(res, 'Notification IDs array is required', httpStatus.BAD_REQUEST);
  }

  const result = await Notification.updateMany(
    { 
      _id: { $in: notificationIds },
      recipientId: req.user.id
    },
    { 
      isRead: true, 
      readAt: new Date() 
    }
  );

  successResponse(res, { modifiedCount: result.modifiedCount }, 'Notifications marked as read', httpStatus.OK);
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.markAllAsRead(req.user.id);

  successResponse(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read', httpStatus.OK);
});

// @desc    Archive notification
// @route   PUT /api/notifications/:id/archive
// @access  Private
export const archiveNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return errorResponse(res, 'Notification not found', httpStatus.NOT_FOUND);
  }

  // Check if user can access this notification
  if (notification.recipientId.toString() !== req.user.id && req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied', httpStatus.FORBIDDEN);
  }

  await notification.archive();

  successResponse(res, notification, 'Notification archived', httpStatus.OK);
});

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.user.id);

  successResponse(res, { count }, 'Unread count retrieved successfully', httpStatus.OK);
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private (Admin, Manager)
export const getNotificationStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const startTime = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endTime = endDate ? new Date(endDate) : new Date();

  const stats = await Notification.aggregate([
    {
      $match: {
        createdAt: { $gte: startTime, $lte: endTime }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        delivered: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        read: {
          $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    }
  ]);

  const result = stats.length > 0 ? stats[0] : {
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0
  };

  successResponse(res, result, 'Notification statistics retrieved successfully', httpStatus.OK);
});

// @desc    Cleanup expired notifications
// @route   DELETE /api/notifications/cleanup
// @access  Private (Admin)
export const cleanupExpiredNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.cleanupExpired();

  successResponse(res, { deletedCount: result.deletedCount }, 'Expired notifications cleaned up', httpStatus.OK);
});

// Routes
const router = express.Router();

// @route   GET /api/notifications
// @desc    Get notifications
// @access  Private
router.get('/', authenticate, getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get unread count
// @access  Private
router.get('/unread-count', authenticate, getUnreadCount);

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Private (Admin, Manager)
router.get('/stats', authenticate, authorize(['admin', 'manager']), getNotificationStats);

// @route   GET /api/notifications/:id
// @desc    Get notification by ID
// @access  Private
router.get('/:id', authenticate, getNotificationById);

// @route   POST /api/notifications
// @desc    Create notification
// @access  Private (Admin, Manager)
router.post('/', authenticate, authorize(['admin', 'manager']), validate(createNotificationSchema), createNotification);

// @route   PUT /api/notifications/:id
// @desc    Update notification
// @access  Private
router.put('/:id', authenticate, validate(updateNotificationSchema), updateNotification);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticate, markAsRead);

// @route   PUT /api/notifications/:id/archive
// @desc    Archive notification
// @access  Private
router.put('/:id/archive', authenticate, archiveNotification);

// @route   PUT /api/notifications/mark-read
// @desc    Mark multiple notifications as read
// @access  Private
router.put('/mark-read', authenticate, validate(markAsReadSchema), markMultipleAsRead);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', authenticate, markAllAsRead);

// @route   DELETE /api/notifications/cleanup
// @desc    Cleanup expired notifications
// @access  Private (Admin)
router.delete('/cleanup', authenticate, authorize(['admin']), cleanupExpiredNotifications);

export default router;