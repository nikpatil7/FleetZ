import Order from '../models/Order.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import httpStatus from 'http-status';

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Admin, Manager)
export const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, driverId, customerId, priority, search } = req.query;
  const { skip, limit: limitNum } = getPagination(page, limit);

  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (driverId) filter.assignedRiderId = driverId;
  if (customerId) filter.customerId = customerId;
  if (priority) filter.priority = priority;
  if (search) {
    filter.$or = [
      { trackingNumber: { $regex: search, $options: 'i' } },
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'customerInfo.name': { $regex: search, $options: 'i' } },
      { 'customerInfo.email': { $regex: search, $options: 'i' } }
    ];
  }

  const orders = await Order.find(filter)
    .populate('customerId', 'name email phone')
    .populate('assignedRiderId', 'name phone vehicle')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Order.countDocuments(filter);
  const pagination = getPaginationMeta(page, limitNum, total);

  paginatedResponse(res, orders, pagination, 'Orders retrieved successfully', httpStatus.OK);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customerId', 'name email phone')
    .populate('assignedRiderId', 'name phone vehicle');
  
  if (!order) {
    return errorResponse(res, 'Order not found', httpStatus.NOT_FOUND);
  }

  successResponse(res, order, 'Order retrieved successfully', httpStatus.OK);
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Admin, Manager)
export const createOrder = asyncHandler(async (req, res) => {
  const {
    customerId,
    customerInfo,
    items,
    pickup,
    dropoff,
    priority = 'normal',
    totalAmount,
    deliveryFee = 0,
    paymentMethod = 'cash',
    specialInstructions,
    scheduledPickupTime,
    scheduledDeliveryTime,
    isUrgent = false,
    requiresSignature = false
  } = req.body;

  // Validate required fields
  if (!items || items.length === 0) {
    return errorResponse(res, 'Order must have at least one item', httpStatus.BAD_REQUEST);
  }

  if (!pickup || !dropoff) {
    return errorResponse(res, 'Pickup and dropoff addresses are required', httpStatus.BAD_REQUEST);
  }

  // Calculate distance if coordinates are provided
  let distance = 0;
  if (pickup.lat && pickup.lng && dropoff.lat && dropoff.lng) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
    const dLng = (dropoff.lng - pickup.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pickup.lat * Math.PI / 180) * Math.cos(dropoff.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    distance = R * c;
  }

  // Calculate estimated delivery time (basic calculation)
  const estimatedDeliveryTime = new Date();
  if (distance > 0) {
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + Math.ceil(distance * 2)); // 2 minutes per km
  } else {
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + 30); // Default 30 minutes
  }

  const order = new Order({
    customerId,
    customerInfo,
    items,
    pickup,
    dropoff,
    priority,
    totalAmount,
    deliveryFee,
    paymentMethod,
    specialInstructions,
    scheduledPickupTime,
    scheduledDeliveryTime,
    estimatedDeliveryTime,
    isUrgent,
    requiresSignature,
    distance,
    estimatedDuration: Math.ceil(distance * 2) || 30
  });

  await order.save();

  // Populate the created order
  const populatedOrder = await Order.findById(order._id)
    .populate('customerId', 'name email phone')
    .populate('assignedRiderId', 'name phone vehicle');

  successResponse(res, populatedOrder, 'Order created successfully', httpStatus.CREATED);
});

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private (Admin, Manager)
export const updateOrder = asyncHandler(async (req, res) => {
  const {
    items,
    pickup,
    dropoff,
    priority,
    totalAmount,
    deliveryFee,
    specialInstructions,
    scheduledPickupTime,
    scheduledDeliveryTime
  } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return errorResponse(res, 'Order not found', httpStatus.NOT_FOUND);
  }

  // Only allow updates for pending or assigned orders
  if (!['pending', 'assigned'].includes(order.status)) {
    return errorResponse(res, 'Cannot update order in current status', httpStatus.BAD_REQUEST);
  }

  // Update fields
  if (items) order.items = items;
  if (pickup) order.pickup = pickup;
  if (dropoff) order.dropoff = dropoff;
  if (priority) order.priority = priority;
  if (totalAmount !== undefined) order.totalAmount = totalAmount;
  if (deliveryFee !== undefined) order.deliveryFee = deliveryFee;
  if (specialInstructions) order.specialInstructions = specialInstructions;
  if (scheduledPickupTime) order.scheduledPickupTime = scheduledPickupTime;
  if (scheduledDeliveryTime) order.scheduledDeliveryTime = scheduledDeliveryTime;

  await order.save();

  const populatedOrder = await Order.findById(order._id)
    .populate('customerId', 'name email phone')
    .populate('assignedRiderId', 'name phone vehicle');

  successResponse(res, populatedOrder, 'Order updated successfully', httpStatus.OK);
});

// @desc    Assign order to driver
// @route   PUT /api/orders/:id/assign
// @access  Private (Admin, Manager)
export const assignOrder = asyncHandler(async (req, res) => {
  const { driverId } = req.body;

  if (!driverId) {
    return errorResponse(res, 'Driver ID is required', httpStatus.BAD_REQUEST);
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return errorResponse(res, 'Order not found', httpStatus.NOT_FOUND);
  }

  if (order.status !== 'pending') {
    return errorResponse(res, 'Order is not in pending status', httpStatus.BAD_REQUEST);
  }

  // Check if driver exists and is available
  const driver = await User.findById(driverId);
  if (!driver || driver.role !== 'driver' || !driver.isActive) {
    return errorResponse(res, 'Invalid driver', httpStatus.BAD_REQUEST);
  }

  if (driver.status !== 'active') {
    return errorResponse(res, 'Driver is not available', httpStatus.BAD_REQUEST);
  }

  // Assign order to driver
  await order.assignDriver(driverId);

  // Update driver status
  await driver.updateStatus('on_trip');

  const populatedOrder = await Order.findById(order._id)
    .populate('customerId', 'name email phone')
    .populate('assignedRiderId', 'name phone vehicle');

  successResponse(res, populatedOrder, 'Order assigned successfully', httpStatus.OK);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, location } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return errorResponse(res, 'Order not found', httpStatus.NOT_FOUND);
  }

  // Validate status transition
  const validTransitions = {
    pending: ['assigned', 'cancelled'],
    assigned: ['accepted', 'cancelled'],
    accepted: ['picked_up', 'cancelled'],
    picked_up: ['in_transit', 'delivered', 'failed'],
    in_transit: ['delivered', 'failed'],
    delivered: [],
    cancelled: [],
    failed: []
  };

  if (!validTransitions[order.status]?.includes(status)) {
    return errorResponse(res, `Cannot change status from ${order.status} to ${status}`, httpStatus.BAD_REQUEST);
  }

  // Update order status
  await order.updateStatus(status, note, location);

  // Update driver status if needed
  if (order.assignedRiderId) {
    const driver = await User.findById(order.assignedRiderId);
    if (driver) {
      if (status === 'delivered' || status === 'cancelled' || status === 'failed') {
        await driver.updateStatus('active');
      }
    }
  }

  const populatedOrder = await Order.findById(order._id)
    .populate('customerId', 'name email phone')
    .populate('assignedRiderId', 'name phone vehicle');

  successResponse(res, populatedOrder, 'Order status updated successfully', httpStatus.OK);
});

// @desc    Get orders by driver
// @route   GET /api/orders/driver/:driverId
// @access  Private
export const getOrdersByDriver = asyncHandler(async (req, res) => {
  const { driverId } = req.params;
  const { status } = req.query;

  const filter = { assignedRiderId: driverId };
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('customerId', 'name email phone')
    .sort({ createdAt: -1 });

  successResponse(res, orders, 'Driver orders retrieved successfully', httpStatus.OK);
});

// @desc    Get unassigned orders
// @route   GET /api/orders/unassigned
// @access  Private (Admin, Manager)
export const getUnassignedOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findUnassigned()
    .populate('customerId', 'name email phone')
    .sort({ createdAt: -1 });

  successResponse(res, orders, 'Unassigned orders retrieved successfully', httpStatus.OK);
});

// @desc    Get overdue orders
// @route   GET /api/orders/overdue
// @access  Private (Admin, Manager)
export const getOverdueOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findOverdue()
    .populate('customerId', 'name email phone')
    .populate('assignedRiderId', 'name phone vehicle')
    .sort({ estimatedDeliveryTime: 1 });

  successResponse(res, orders, 'Overdue orders retrieved successfully', httpStatus.OK);
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return errorResponse(res, 'Order not found', httpStatus.NOT_FOUND);
  }

  if (['delivered', 'cancelled'].includes(order.status)) {
    return errorResponse(res, 'Order cannot be cancelled', httpStatus.BAD_REQUEST);
  }

  order.cancellationReason = reason;
  await order.updateStatus('cancelled', reason);

  // Release driver if assigned
  if (order.assignedRiderId) {
    const driver = await User.findById(order.assignedRiderId);
    if (driver) {
      await driver.updateStatus('active');
    }
  }

  const populatedOrder = await Order.findById(order._id)
    .populate('customerId', 'name email phone')
    .populate('assignedRiderId', 'name phone vehicle');

  successResponse(res, populatedOrder, 'Order cancelled successfully', httpStatus.OK);
});

// @desc    Get order by tracking number
// @route   GET /api/orders/track/:trackingNumber
// @access  Public
export const getOrderByTrackingNumber = asyncHandler(async (req, res) => {
  const { trackingNumber } = req.params;

  const order = await Order.findByTrackingNumber(trackingNumber);
  if (!order) {
    return errorResponse(res, 'Order not found', httpStatus.NOT_FOUND);
  }

  // Return limited information for public tracking
  const publicOrder = {
    trackingNumber: order.trackingNumber,
    status: order.status,
    items: order.items.map(item => ({ title: item.title, qty: item.qty })),
    pickup: {
      address: order.pickup.address,
      lat: order.pickup.lat,
      lng: order.pickup.lng
    },
    dropoff: {
      address: order.dropoff.address,
      lat: order.dropoff.lat,
      lng: order.dropoff.lng
    },
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    timeline: order.timeline,
    createdAt: order.createdAt
  };

  successResponse(res, publicOrder, 'Order tracking information retrieved successfully', httpStatus.OK);
});