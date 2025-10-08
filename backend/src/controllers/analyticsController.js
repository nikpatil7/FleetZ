import Analytics from '../models/Analytics.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Location from '../models/Location.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import httpStatus from 'http-status';

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private (Admin, Manager)
export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const { period = '24h' } = req.query;

  // Calculate time range
  const now = new Date();
  let startTime;
  switch (period) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Get order statistics
  const totalOrders = await Order.countDocuments({ createdAt: { $gte: startTime } });
  const pendingOrders = await Order.countDocuments({ 
    status: 'pending', 
    createdAt: { $gte: startTime } 
  });
  const assignedOrders = await Order.countDocuments({ 
    status: 'assigned', 
    createdAt: { $gte: startTime } 
  });
  const inTransitOrders = await Order.countDocuments({ 
    status: { $in: ['accepted', 'picked_up', 'in_transit'] }, 
    createdAt: { $gte: startTime } 
  });
  const deliveredOrders = await Order.countDocuments({ 
    status: 'delivered', 
    createdAt: { $gte: startTime } 
  });
  const cancelledOrders = await Order.countDocuments({ 
    status: 'cancelled', 
    createdAt: { $gte: startTime } 
  });
  const failedOrders = await Order.countDocuments({ 
    status: 'failed', 
    createdAt: { $gte: startTime } 
  });

  // Get driver statistics
  const totalDrivers = await User.countDocuments({ role: 'driver', isActive: true });
  const activeDrivers = await User.countDocuments({ 
    role: 'driver', 
    status: 'active', 
    isActive: true 
  });
  const onTripDrivers = await User.countDocuments({ 
    role: 'driver', 
    status: 'on_trip', 
    isActive: true 
  });
  const offlineDrivers = await User.countDocuments({ 
    role: 'driver', 
    status: 'offline', 
    isActive: true 
  });

  // Get vehicle statistics
  const totalVehicles = await Vehicle.countDocuments({ isActive: true });
  const availableVehicles = await Vehicle.countDocuments({ 
    isActive: true, 
    status: 'available' 
  });
  const inUseVehicles = await Vehicle.countDocuments({ 
    isActive: true, 
    status: 'in_use' 
  });
  const maintenanceVehicles = await Vehicle.countDocuments({ 
    isActive: true, 
    status: 'maintenance' 
  });

  // Get revenue statistics
  const revenueData = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
        createdAt: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalDeliveryFees: { $sum: '$deliveryFee' },
        averageOrderValue: { $avg: '$totalAmount' }
      }
    }
  ]);

  const revenue = revenueData.length > 0 ? revenueData[0] : {
    totalRevenue: 0,
    totalDeliveryFees: 0,
    averageOrderValue: 0
  };

  // Get performance metrics
  const performanceData = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
        createdAt: { $gte: startTime },
        actualDeliveryTime: { $exists: true },
        estimatedDeliveryTime: { $exists: true }
      }
    },
    {
      $project: {
        deliveryTime: {
          $divide: [
            { $subtract: ['$actualDeliveryTime', '$createdAt'] },
            60000 // Convert to minutes
          ]
        },
        isOnTime: {
          $cond: [
            { $lte: ['$actualDeliveryTime', '$estimatedDeliveryTime'] },
            1,
            0
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        averageDeliveryTime: { $avg: '$deliveryTime' },
        onTimeDeliveryRate: { $avg: '$isOnTime' }
      }
    }
  ]);

  const performance = performanceData.length > 0 ? performanceData[0] : {
    averageDeliveryTime: 0,
    onTimeDeliveryRate: 0
  };

  // Get cancellation and failure rates
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
  const failureRate = totalOrders > 0 ? (failedOrders / totalOrders) * 100 : 0;

  // Get geography data
  const geographyData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startTime },
        distance: { $exists: true, $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        totalDistance: { $sum: '$distance' },
        averageDistance: { $avg: '$distance' },
        uniqueCities: { $addToSet: '$pickup.address' }
      }
    }
  ]);

  const geography = geographyData.length > 0 ? {
    totalDistance: geographyData[0].totalDistance,
    averageDistance: geographyData[0].averageDistance,
    citiesCovered: geographyData[0].uniqueCities.length
  } : {
    totalDistance: 0,
    averageDistance: 0,
    citiesCovered: 0
  };

  const analytics = {
    period,
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      assigned: assignedOrders,
      inTransit: inTransitOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
      failed: failedOrders
    },
    drivers: {
      total: totalDrivers,
      active: activeDrivers,
      onTrip: onTripDrivers,
      offline: offlineDrivers
    },
    vehicles: {
      total: totalVehicles,
      available: availableVehicles,
      inUse: inUseVehicles,
      maintenance: maintenanceVehicles
    },
    revenue: {
      total: revenue.totalRevenue,
      deliveryFees: revenue.totalDeliveryFees,
      averageOrderValue: revenue.averageOrderValue
    },
    performance: {
      averageDeliveryTime: Math.round(performance.averageDeliveryTime),
      onTimeDeliveryRate: Math.round(performance.onTimeDeliveryRate * 100),
      cancellationRate: Math.round(cancellationRate),
      failureRate: Math.round(failureRate)
    },
    geography: {
      totalDistance: Math.round(geography.totalDistance),
      averageDistance: Math.round(geography.averageDistance),
      citiesCovered: geography.citiesCovered
    }
  };

  successResponse(res, analytics, 'Dashboard analytics retrieved successfully', httpStatus.OK);
});

// @desc    Get order analytics
// @route   GET /api/analytics/orders
// @access  Private (Admin, Manager)
export const getOrderAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const startTime = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endTime = endDate ? new Date(endDate) : new Date();

  let groupFormat;
  switch (groupBy) {
    case 'hour':
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' }
      };
      break;
    case 'day':
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      break;
    case 'week':
      groupFormat = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      };
      break;
    case 'month':
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
      break;
    default:
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
  }

  const orderAnalytics = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startTime, $lte: endTime }
      }
    },
    {
      $group: {
        _id: groupFormat,
        totalOrders: { $sum: 1 },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$totalAmount', 0] }
        },
        averageOrderValue: {
          $avg: { $cond: [{ $eq: ['$status', 'delivered'] }, '$totalAmount', null] }
        }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  successResponse(res, orderAnalytics, 'Order analytics retrieved successfully', httpStatus.OK);
});

// @desc    Get driver performance analytics
// @route   GET /api/analytics/drivers
// @access  Private (Admin, Manager)
export const getDriverAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 10 } = req.query;

  const startTime = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endTime = endDate ? new Date(endDate) : new Date();

  const driverAnalytics = await Order.aggregate([
    {
      $match: {
        assignedRiderId: { $exists: true },
        createdAt: { $gte: startTime, $lte: endTime }
      }
    },
    {
      $group: {
        _id: '$assignedRiderId',
        totalOrders: { $sum: 1 },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$totalAmount', 0] }
        },
        averageDeliveryTime: {
          $avg: {
            $cond: [
              { $and: [
                { $eq: ['$status', 'delivered'] },
                { $ne: ['$actualDeliveryTime', null] }
              ]},
              {
                $divide: [
                  { $subtract: ['$actualDeliveryTime', '$createdAt'] },
                  60000
                ]
              },
              null
            ]
          }
        },
        onTimeDeliveries: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$status', 'delivered'] },
                { $lte: ['$actualDeliveryTime', '$estimatedDeliveryTime'] }
              ]},
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'driver'
      }
    },
    {
      $unwind: '$driver'
    },
    {
      $project: {
        driverId: '$_id',
        driverName: '$driver.name',
        driverEmail: '$driver.email',
        totalOrders: 1,
        deliveredOrders: 1,
        cancelledOrders: 1,
        totalRevenue: 1,
        averageDeliveryTime: { $round: ['$averageDeliveryTime', 2] },
        deliveryRate: {
          $round: [
            { $multiply: [{ $divide: ['$deliveredOrders', '$totalOrders'] }, 100] },
            2
          ]
        },
        onTimeDeliveryRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeDeliveries', '$deliveredOrders'] }, 100] },
            2
          ]
        },
        averageOrderValue: {
          $round: [
            { $divide: ['$totalRevenue', '$deliveredOrders'] },
            2
          ]
        }
      }
    },
    {
      $sort: { totalOrders: -1 }
    },
    {
      $limit: parseInt(limit)
    }
  ]);

  successResponse(res, driverAnalytics, 'Driver analytics retrieved successfully', httpStatus.OK);
});

// @desc    Get revenue analytics
// @route   GET /api/analytics/revenue
// @access  Private (Admin, Manager)
export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const startTime = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endTime = endDate ? new Date(endDate) : new Date();

  let groupFormat;
  switch (groupBy) {
    case 'hour':
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' }
      };
      break;
    case 'day':
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      break;
    case 'week':
      groupFormat = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      };
      break;
    case 'month':
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
      break;
    default:
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
  }

  const revenueAnalytics = await Order.aggregate([
    {
      $match: {
        status: 'delivered',
        createdAt: { $gte: startTime, $lte: endTime }
      }
    },
    {
      $group: {
        _id: groupFormat,
        totalRevenue: { $sum: '$totalAmount' },
        totalDeliveryFees: { $sum: '$deliveryFee' },
        orderCount: { $sum: 1 },
        averageOrderValue: { $avg: '$totalAmount' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  successResponse(res, revenueAnalytics, 'Revenue analytics retrieved successfully', httpStatus.OK);
});

// @desc    Get performance trends
// @route   GET /api/analytics/trends
// @access  Private (Admin, Manager)
export const getPerformanceTrends = asyncHandler(async (req, res) => {
  const { period = '7d' } = req.query;

  const now = new Date();
  let startTime;
  switch (period) {
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Get current period data
  const currentData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$totalAmount', 0] }
        }
      }
    }
  ]);

  // Get previous period data for comparison
  const previousStartTime = new Date(startTime.getTime() - (now.getTime() - startTime.getTime()));
  const previousData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: previousStartTime, $lt: startTime }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$totalAmount', 0] }
        }
      }
    }
  ]);

  const current = currentData.length > 0 ? currentData[0] : { totalOrders: 0, deliveredOrders: 0, totalRevenue: 0 };
  const previous = previousData.length > 0 ? previousData[0] : { totalOrders: 0, deliveredOrders: 0, totalRevenue: 0 };

  const trends = {
    orders: {
      current: current.totalOrders,
      previous: previous.totalOrders,
      growth: previous.totalOrders > 0 ? 
        Math.round(((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100) : 0
    },
    deliveries: {
      current: current.deliveredOrders,
      previous: previous.deliveredOrders,
      growth: previous.deliveredOrders > 0 ? 
        Math.round(((current.deliveredOrders - previous.deliveredOrders) / previous.deliveredOrders) * 100) : 0
    },
    revenue: {
      current: current.totalRevenue,
      previous: previous.totalRevenue,
      growth: previous.totalRevenue > 0 ? 
        Math.round(((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100) : 0
    }
  };

  successResponse(res, trends, 'Performance trends retrieved successfully', httpStatus.OK);
});
