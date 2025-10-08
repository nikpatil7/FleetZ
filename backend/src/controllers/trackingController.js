import Location from '../models/Location.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import httpStatus from 'http-status';

// @desc    Update driver location
// @route   POST /api/tracking/location
// @access  Private (Driver)
export const updateLocation = asyncHandler(async (req, res) => {
  const {
    lat,
    lng,
    address,
    accuracy,
    speed,
    heading,
    altitude,
    batteryLevel,
    isCharging,
    networkType,
    signalStrength,
    sessionId,
    metadata
  } = req.body;

  // Validate required coordinates
  if (!lat || !lng) {
    return errorResponse(res, 'Latitude and longitude are required', httpStatus.BAD_REQUEST);
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return errorResponse(res, 'Invalid coordinates', httpStatus.BAD_REQUEST);
  }

  const location = new Location({
    riderId: req.user.id,
    coords: { lat, lng },
    address,
    accuracy,
    speed,
    heading,
    altitude,
    batteryLevel,
    isCharging,
    networkType,
    signalStrength,
    sessionId,
    metadata
  });

  await location.save();

  // Update user's last seen
  await User.findByIdAndUpdate(req.user.id, { lastSeen: new Date() });

  successResponse(res, location, 'Location updated successfully', httpStatus.CREATED);
});

// @desc    Get driver locations
// @route   GET /api/tracking/drivers
// @access  Private (Admin, Manager)
export const getDriverLocations = asyncHandler(async (req, res) => {
  const { active = 'true' } = req.query;

  let drivers;
  if (active === 'true') {
    // Get active drivers (last seen within 5 minutes)
    const activeRiderIds = await Location.getActiveRiders();
    drivers = await User.find({ 
      _id: { $in: activeRiderIds },
      role: 'driver',
      isActive: true 
    }).select('name phone email status lastSeen vehicle');
  } else {
    // Get all drivers
    drivers = await User.find({ 
      role: 'driver',
      isActive: true 
    }).select('name phone email status lastSeen vehicle');
  }

  // Get latest location for each driver
  const driversWithLocations = await Promise.all(
    drivers.map(async (driver) => {
      const latestLocation = await Location.findLatestByRider(driver._id);
      return {
        ...driver.toObject(),
        location: latestLocation ? {
          lat: latestLocation.coords.lat,
          lng: latestLocation.coords.lng,
          address: latestLocation.address,
          speed: latestLocation.speed,
          heading: latestLocation.heading,
          timestamp: latestLocation.ts,
          accuracy: latestLocation.accuracy
        } : null
      };
    })
  );

  successResponse(res, driversWithLocations, 'Driver locations retrieved successfully', httpStatus.OK);
});

// @desc    Get driver location history
// @route   GET /api/tracking/driver/:driverId
// @access  Private (Admin, Manager)
export const getDriverLocationHistory = asyncHandler(async (req, res) => {
  const { driverId } = req.params;
  const { startTime, endTime, limit = 100 } = req.query;

  // Validate driver exists
  const driver = await User.findById(driverId);
  if (!driver || driver.role !== 'driver') {
    return errorResponse(res, 'Driver not found', httpStatus.NOT_FOUND);
  }

  let locations;
  if (startTime && endTime) {
    locations = await Location.findInTimeRange(
      driverId,
      new Date(startTime),
      new Date(endTime)
    );
  } else {
    locations = await Location.findByRider(driverId, parseInt(limit));
  }

  successResponse(res, locations, 'Driver location history retrieved successfully', httpStatus.OK);
});

// @desc    Get driver path
// @route   GET /api/tracking/driver/:driverId/path
// @access  Private (Admin, Manager)
export const getDriverPath = asyncHandler(async (req, res) => {
  const { driverId } = req.params;
  const { startTime, endTime } = req.query;

  if (!startTime || !endTime) {
    return errorResponse(res, 'Start time and end time are required', httpStatus.BAD_REQUEST);
  }

  // Validate driver exists
  const driver = await User.findById(driverId);
  if (!driver || driver.role !== 'driver') {
    return errorResponse(res, 'Driver not found', httpStatus.NOT_FOUND);
  }

  const path = await Location.getRiderPath(
    driverId,
    new Date(startTime),
    new Date(endTime)
  );

  // Convert to GeoJSON format
  const geoJsonPath = {
    type: 'FeatureCollection',
    features: path.map(location => location.toGeoJSON())
  };

  successResponse(res, geoJsonPath, 'Driver path retrieved successfully', httpStatus.OK);
});

// @desc    Get locations near point
// @route   GET /api/tracking/near
// @access  Private (Admin, Manager)
export const getLocationsNearPoint = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 5, limit = 50 } = req.query;

  if (!lat || !lng) {
    return errorResponse(res, 'Latitude and longitude are required', httpStatus.BAD_REQUEST);
  }

  const locations = await Location.findNearLocation(
    parseFloat(lat),
    parseFloat(lng),
    parseFloat(radius),
    parseInt(limit)
  );

  successResponse(res, locations, 'Nearby locations retrieved successfully', httpStatus.OK);
});

// @desc    Get public order tracking
// @route   GET /api/tracking/public/:trackingNumber
// @access  Public
export const getPublicOrderTracking = asyncHandler(async (req, res) => {
  const { trackingNumber } = req.params;

  const order = await Order.findByTrackingNumber(trackingNumber);
  if (!order) {
    return errorResponse(res, 'Order not found', httpStatus.NOT_FOUND);
  }

  // Get latest driver location if order is assigned
  let driverLocation = null;
  if (order.assignedRiderId) {
    const latestLocation = await Location.findLatestByRider(order.assignedRiderId);
    if (latestLocation) {
      driverLocation = {
        lat: latestLocation.coords.lat,
        lng: latestLocation.coords.lng,
        address: latestLocation.address,
        speed: latestLocation.speed,
        heading: latestLocation.heading,
        timestamp: latestLocation.ts,
        accuracy: latestLocation.accuracy
      };
    }
  }

  // Return public tracking information
  const trackingInfo = {
    order: {
      trackingNumber: order.trackingNumber,
      status: order.status,
      items: order.items.map(item => ({
        title: item.title,
        qty: item.qty
      })),
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
    },
    driver: driverLocation ? {
      location: driverLocation,
      lastUpdate: driverLocation.timestamp
    } : null
  };

  successResponse(res, trackingInfo, 'Order tracking information retrieved successfully', httpStatus.OK);
});

// @desc    Get session locations
// @route   GET /api/tracking/session/:sessionId
// @access  Private
export const getSessionLocations = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const locations = await Location.findBySession(sessionId);

  successResponse(res, locations, 'Session locations retrieved successfully', httpStatus.OK);
});

// @desc    Get tracking statistics
// @route   GET /api/tracking/stats
// @access  Private (Admin, Manager)
export const getTrackingStats = asyncHandler(async (req, res) => {
  const { period = '24h' } = req.query;

  let startTime;
  switch (period) {
    case '1h':
      startTime = new Date(Date.now() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  const totalLocations = await Location.countDocuments({
    ts: { $gte: startTime },
    isActive: true
  });

  const activeDrivers = await Location.getActiveRiders();
  const totalDrivers = await User.countDocuments({ role: 'driver', isActive: true });

  const stats = {
    period,
    totalLocations,
    activeDrivers: activeDrivers.length,
    totalDrivers,
    averageLocationsPerDriver: totalDrivers > 0 ? Math.round(totalLocations / totalDrivers) : 0,
    coverageRate: totalDrivers > 0 ? Math.round((activeDrivers.length / totalDrivers) * 100) : 0
  };

  successResponse(res, stats, 'Tracking statistics retrieved successfully', httpStatus.OK);
});

// @desc    Cleanup old locations
// @route   DELETE /api/tracking/cleanup
// @access  Private (Admin)
export const cleanupOldLocations = asyncHandler(async (req, res) => {
  const { daysOld = 30 } = req.query;

  const result = await Location.cleanupOldLocations(parseInt(daysOld));

  successResponse(res, { deletedCount: result.deletedCount }, 'Old locations cleaned up successfully', httpStatus.OK);
});

// @desc    Get real-time fleet status
// @route   GET /api/tracking/fleet
// @access  Private (Admin, Manager)
export const getFleetStatus = asyncHandler(async (req, res) => {
  const activeRiderIds = await Location.getActiveRiders();
  
  const drivers = await User.find({
    _id: { $in: activeRiderIds },
    role: 'driver',
    isActive: true
  }).select('name phone email status vehicle');

  const fleetStatus = await Promise.all(
    drivers.map(async (driver) => {
      const latestLocation = await Location.findLatestByRider(driver._id);
      const assignedOrders = await Order.findByDriver(driver._id);
      
      return {
        driver: driver.toObject(),
        location: latestLocation ? {
          lat: latestLocation.coords.lat,
          lng: latestLocation.coords.lng,
          address: latestLocation.address,
          speed: latestLocation.speed,
          heading: latestLocation.heading,
          timestamp: latestLocation.ts,
          accuracy: latestLocation.accuracy
        } : null,
        assignedOrders: assignedOrders.length,
        status: driver.status
      };
    })
  );

  successResponse(res, fleetStatus, 'Fleet status retrieved successfully', httpStatus.OK);
});
