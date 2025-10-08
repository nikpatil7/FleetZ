import User from '../models/User.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import httpStatus from 'http-status';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, status, search } = req.query;
  const { skip, limit: limitNum } = getPagination(page, limit);

  // Build filter
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter)
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await User.countDocuments(filter);
  const pagination = getPaginationMeta(page, limitNum, total);

  paginatedResponse(res, users, pagination, 'Users retrieved successfully', httpStatus.OK);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin)
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  
  if (!user) {
    return errorResponse(res, 'User not found', httpStatus.NOT_FOUND);
  }

  successResponse(res, user, 'User retrieved successfully', httpStatus.OK);
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, password, vehicle, address, emergencyContact } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return errorResponse(res, 'User with this email already exists', httpStatus.CONFLICT);
  }

  // Create user
  const user = new User({
    name,
    email,
    phone,
    role,
    passwordHash: password, // Will be hashed by pre-save middleware
    vehicle,
    address,
    emergencyContact
  });

  await user.save();

  successResponse(res, user.toSafeObject(), 'User created successfully', httpStatus.CREATED);
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, role, status, vehicle, address, emergencyContact, preferences } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return errorResponse(res, 'User not found', httpStatus.NOT_FOUND);
  }

  // Check if email is being changed and if it already exists
  if (email && email !== user.email) {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', httpStatus.CONFLICT);
    }
  }

  // Update fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (role) user.role = role;
  if (status) user.status = status;
  if (vehicle) user.vehicle = { ...user.vehicle, ...vehicle };
  if (address) user.address = { ...user.address, ...address };
  if (emergencyContact) user.emergencyContact = { ...user.emergencyContact, ...emergencyContact };
  if (preferences) user.preferences = { ...user.preferences, ...preferences };

  await user.save();

  successResponse(res, user.toSafeObject(), 'User updated successfully', httpStatus.OK);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return errorResponse(res, 'User not found', httpStatus.NOT_FOUND);
  }

  // Soft delete by deactivating user
  user.isActive = false;
  await user.save();

  successResponse(res, null, 'User deactivated successfully', httpStatus.OK);
});

// @desc    Get drivers
// @route   GET /api/users/drivers
// @access  Private (Admin, Manager)
export const getDrivers = asyncHandler(async (req, res) => {
  const { status, available } = req.query;
  
  let filter = { role: 'driver', isActive: true };
  
  if (status) {
    filter.status = status;
  }
  
  if (available === 'true') {
    filter.status = 'active';
  }

  const drivers = await User.find(filter)
    .select('-passwordHash')
    .sort({ name: 1 });

  successResponse(res, drivers, 'Drivers retrieved successfully', httpStatus.OK);
});

// @desc    Get driver statistics
// @route   GET /api/users/drivers/stats
// @access  Private (Admin, Manager)
export const getDriverStats = asyncHandler(async (req, res) => {
  const totalDrivers = await User.countDocuments({ role: 'driver', isActive: true });
  const activeDrivers = await User.countDocuments({ role: 'driver', status: 'active', isActive: true });
  const onTripDrivers = await User.countDocuments({ role: 'driver', status: 'on_trip', isActive: true });
  const offlineDrivers = await User.countDocuments({ role: 'driver', status: 'offline', isActive: true });

  const stats = {
    total: totalDrivers,
    active: activeDrivers,
    onTrip: onTripDrivers,
    offline: offlineDrivers,
    utilizationRate: totalDrivers > 0 ? Math.round((activeDrivers / totalDrivers) * 100) : 0
  };

  successResponse(res, stats, 'Driver statistics retrieved successfully', httpStatus.OK);
});

// @desc    Update driver status
// @route   PUT /api/users/:id/status
// @access  Private (Admin, Manager)
export const updateDriverStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return errorResponse(res, 'User not found', httpStatus.NOT_FOUND);
  }

  if (user.role !== 'driver') {
    return errorResponse(res, 'User is not a driver', httpStatus.BAD_REQUEST);
  }

  await user.updateStatus(status);

  successResponse(res, user.toSafeObject(), 'Driver status updated successfully', httpStatus.OK);
});

// @desc    Update driver location
// @route   PUT /api/users/:id/location
// @access  Private (Driver)
export const updateDriverLocation = asyncHandler(async (req, res) => {
  const { lat, lng, address } = req.body;

  // Only allow drivers to update their own location
  if (req.user.id !== req.params.id) {
    return errorResponse(res, 'Unauthorized to update this location', httpStatus.FORBIDDEN);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return errorResponse(res, 'User not found', httpStatus.NOT_FOUND);
  }

  // Update last seen
  await user.updateLastSeen();

  successResponse(res, { lat, lng, address }, 'Location updated successfully', httpStatus.OK);
});

// @desc    Get user dashboard data
// @route   GET /api/users/dashboard
// @access  Private
export const getUserDashboard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  
  let dashboardData = {
    user: user.toSafeObject(),
    stats: {}
  };

  // Add role-specific stats
  if (user.role === 'driver') {
    // Driver-specific dashboard data would go here
    dashboardData.stats = {
      totalOrders: 0, // Would be calculated from orders
      completedOrders: 0,
      rating: user.rating.average,
      totalEarnings: 0
    };
  } else if (user.role === 'manager') {
    // Manager-specific dashboard data would go here
    dashboardData.stats = {
      totalOrders: 0,
      activeDrivers: 0,
      pendingOrders: 0
    };
  } else if (user.role === 'admin') {
    // Admin-specific dashboard data would go here
    dashboardData.stats = {
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 0
    };
  }

  successResponse(res, dashboardData, 'Dashboard data retrieved successfully', httpStatus.OK);
});