import express from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  assignOrder,
  updateOrderStatus,
  getOrdersByDriver,
  getUnassignedOrders,
  getOverdueOrders,
  cancelOrder,
  getOrderByTrackingNumber
} from '../controllers/orderController.js';

const router = express.Router();

// Validation schemas
const createOrderSchema = Joi.object({
  customerId: Joi.string().required(),
  customerInfo: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required()
  }).required(),
  items: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      qty: Joi.number().min(1).required(),
      price: Joi.number().min(0).required(),
      weight: Joi.number().min(0).optional(),
      dimensions: Joi.object({
        length: Joi.number().min(0),
        width: Joi.number().min(0),
        height: Joi.number().min(0)
      }).optional(),
      description: Joi.string().optional(),
      category: Joi.string().valid('food', 'electronics', 'clothing', 'documents', 'fragile', 'other').optional()
    })
  ).min(1).required(),
  pickup: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
    landmark: Joi.string().optional(),
    instructions: Joi.string().optional(),
    contactName: Joi.string().optional(),
    contactPhone: Joi.string().optional()
  }).required(),
  dropoff: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
    landmark: Joi.string().optional(),
    instructions: Joi.string().optional(),
    contactName: Joi.string().optional(),
    contactPhone: Joi.string().optional()
  }).required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  totalAmount: Joi.number().min(0).required(),
  deliveryFee: Joi.number().min(0).optional(),
  paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'wallet', 'online').optional(),
  specialInstructions: Joi.string().optional(),
  scheduledPickupTime: Joi.date().optional(),
  scheduledDeliveryTime: Joi.date().optional(),
  isUrgent: Joi.boolean().optional(),
  requiresSignature: Joi.boolean().optional()
});

const updateOrderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      qty: Joi.number().min(1).required(),
      price: Joi.number().min(0).required(),
      weight: Joi.number().min(0).optional(),
      dimensions: Joi.object({
        length: Joi.number().min(0),
        width: Joi.number().min(0),
        height: Joi.number().min(0)
      }).optional(),
      description: Joi.string().optional(),
      category: Joi.string().valid('food', 'electronics', 'clothing', 'documents', 'fragile', 'other').optional()
    })
  ).min(1).optional(),
  pickup: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
    landmark: Joi.string().optional(),
    instructions: Joi.string().optional(),
    contactName: Joi.string().optional(),
    contactPhone: Joi.string().optional()
  }).optional(),
  dropoff: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().required(),
    landmark: Joi.string().optional(),
    instructions: Joi.string().optional(),
    contactName: Joi.string().optional(),
    contactPhone: Joi.string().optional()
  }).optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  totalAmount: Joi.number().min(0).optional(),
  deliveryFee: Joi.number().min(0).optional(),
  specialInstructions: Joi.string().optional(),
  scheduledPickupTime: Joi.date().optional(),
  scheduledDeliveryTime: Joi.date().optional()
});

const assignOrderSchema = Joi.object({
  driverId: Joi.string().required()
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed').required(),
  note: Joi.string().optional(),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    address: Joi.string()
  }).optional()
});

const cancelOrderSchema = Joi.object({
  reason: Joi.string().required()
});

// Routes
// @route   GET /api/orders
// @desc    Get all orders
// @access  Private (Admin, Manager)
router.get('/', authenticate, authorize(['admin', 'manager']), getOrders);

// @route   GET /api/orders/unassigned
// @desc    Get unassigned orders
// @access  Private (Admin, Manager)
router.get('/unassigned', authenticate, authorize(['admin', 'manager']), getUnassignedOrders);

// @route   GET /api/orders/overdue
// @desc    Get overdue orders
// @access  Private (Admin, Manager)
router.get('/overdue', authenticate, authorize(['admin', 'manager']), getOverdueOrders);

// @route   GET /api/orders/driver/:driverId
// @desc    Get orders by driver
// @access  Private
router.get('/driver/:driverId', authenticate, getOrdersByDriver);

// @route   GET /api/orders/track/:trackingNumber
// @desc    Get order by tracking number (public)
// @access  Public
router.get('/track/:trackingNumber', getOrderByTrackingNumber);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', authenticate, getOrderById);

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (Admin, Manager)
router.post('/', authenticate, authorize(['admin', 'manager']), validate(createOrderSchema), createOrder);

// @route   PUT /api/orders/:id
// @desc    Update order
// @access  Private (Admin, Manager)
router.put('/:id', authenticate, authorize(['admin', 'manager']), validate(updateOrderSchema), updateOrder);

// @route   PUT /api/orders/:id/assign
// @desc    Assign order to driver
// @access  Private (Admin, Manager)
router.put('/:id/assign', authenticate, authorize(['admin', 'manager']), validate(assignOrderSchema), assignOrder);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', authenticate, validate(updateOrderStatusSchema), updateOrderStatus);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', authenticate, validate(cancelOrderSchema), cancelOrder);

export default router;