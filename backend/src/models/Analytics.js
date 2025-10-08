import mongoose from 'mongoose';

const AnalyticsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
      required: [true, 'Period is required'],
      index: true
    },
    metrics: {
      orders: {
        total: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        assigned: { type: Number, default: 0 },
        inTransit: { type: Number, default: 0 },
        delivered: { type: Number, default: 0 },
        cancelled: { type: Number, default: 0 },
        failed: { type: Number, default: 0 }
      },
      drivers: {
        total: { type: Number, default: 0 },
        active: { type: Number, default: 0 },
        online: { type: Number, default: 0 },
        onTrip: { type: Number, default: 0 },
        offline: { type: Number, default: 0 }
      },
      vehicles: {
        total: { type: Number, default: 0 },
        available: { type: Number, default: 0 },
        inUse: { type: Number, default: 0 },
        maintenance: { type: Number, default: 0 },
        outOfService: { type: Number, default: 0 }
      },
      revenue: {
        total: { type: Number, default: 0 },
        deliveryFees: { type: Number, default: 0 },
        commissions: { type: Number, default: 0 },
        penalties: { type: Number, default: 0 }
      },
      performance: {
        averageDeliveryTime: { type: Number, default: 0 }, // in minutes
        onTimeDeliveryRate: { type: Number, default: 0 }, // percentage
        customerSatisfaction: { type: Number, default: 0 }, // rating 1-5
        driverRating: { type: Number, default: 0 }, // rating 1-5
        cancellationRate: { type: Number, default: 0 }, // percentage
        failureRate: { type: Number, default: 0 } // percentage
      },
      geography: {
        totalDistance: { type: Number, default: 0 }, // in kilometers
        averageDistance: { type: Number, default: 0 }, // in kilometers
        citiesCovered: { type: Number, default: 0 },
        zonesActive: { type: Number, default: 0 }
      }
    },
    breakdown: {
      byDriver: [{
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        orders: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        rating: { type: Number, default: 0 },
        distance: { type: Number, default: 0 }
      }],
      byVehicle: [{
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
        type: { type: String },
        orders: { type: Number, default: 0 },
        distance: { type: Number, default: 0 },
        fuelConsumption: { type: Number, default: 0 }
      }],
      byCity: [{
        city: { type: String },
        orders: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        drivers: { type: Number, default: 0 }
      }],
      byTimeSlot: [{
        hour: { type: Number },
        orders: { type: Number, default: 0 },
        averageDeliveryTime: { type: Number, default: 0 }
      }]
    },
    trends: {
      orderGrowth: { type: Number, default: 0 }, // percentage change
      revenueGrowth: { type: Number, default: 0 }, // percentage change
      driverGrowth: { type: Number, default: 0 }, // percentage change
      efficiencyImprovement: { type: Number, default: 0 } // percentage change
    },
    alerts: [{
      type: {
        type: String,
        enum: ['performance_drop', 'high_cancellation', 'driver_shortage', 'vehicle_maintenance', 'revenue_drop'],
        required: true
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
      },
      message: { type: String, required: true },
      threshold: { type: Number },
      actual: { type: Number },
      resolved: { type: Boolean, default: false }
    }],
    metadata: {
      generatedAt: { type: Date, default: Date.now },
      generatedBy: { type: String, default: 'system' },
      version: { type: String, default: '1.0' },
      dataQuality: { type: Number, min: 0, max: 1, default: 1 }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for better query performance
AnalyticsSchema.index({ date: -1, period: 1 });
AnalyticsSchema.index({ period: 1, date: -1 });
AnalyticsSchema.index({ 'metadata.generatedAt': -1 });

// Virtual for is current period
AnalyticsSchema.virtual('isCurrentPeriod').get(function() {
  const now = new Date();
  const recordDate = new Date(this.date);
  
  switch (this.period) {
    case 'hourly':
      return now.getTime() - recordDate.getTime() < 60 * 60 * 1000;
    case 'daily':
      return now.getDate() === recordDate.getDate() && 
             now.getMonth() === recordDate.getMonth() && 
             now.getFullYear() === recordDate.getFullYear();
    case 'weekly':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return recordDate >= weekAgo;
    case 'monthly':
      return now.getMonth() === recordDate.getMonth() && 
             now.getFullYear() === recordDate.getFullYear();
    case 'yearly':
      return now.getFullYear() === recordDate.getFullYear();
    default:
      return false;
  }
});

// Virtual for efficiency score
AnalyticsSchema.virtual('efficiencyScore').get(function() {
  const metrics = this.metrics.performance;
  const weights = {
    onTimeDelivery: 0.3,
    customerSatisfaction: 0.25,
    driverRating: 0.2,
    cancellationRate: 0.15,
    failureRate: 0.1
  };
  
  const score = (
    (metrics.onTimeDeliveryRate / 100) * weights.onTimeDelivery +
    (metrics.customerSatisfaction / 5) * weights.customerSatisfaction +
    (metrics.driverRating / 5) * weights.driverRating +
    ((100 - metrics.cancellationRate) / 100) * weights.cancellationRate +
    ((100 - metrics.failureRate) / 100) * weights.failureRate
  ) * 100;
  
  return Math.round(score);
});

// Instance methods
AnalyticsSchema.methods.addAlert = function(type, severity, message, threshold = null, actual = null) {
  this.alerts.push({
    type,
    severity,
    message,
    threshold,
    actual,
    resolved: false
  });
  return this.save();
};

AnalyticsSchema.methods.resolveAlert = function(alertIndex) {
  if (this.alerts[alertIndex]) {
    this.alerts[alertIndex].resolved = true;
    return this.save();
  }
  return Promise.resolve(this);
};

AnalyticsSchema.methods.updateMetrics = function(newMetrics) {
  Object.keys(newMetrics).forEach(key => {
    if (this.metrics[key]) {
      Object.assign(this.metrics[key], newMetrics[key]);
    }
  });
  return this.save();
};

// Static methods
AnalyticsSchema.statics.getLatest = function(period = 'daily') {
  return this.findOne({ period })
    .sort({ date: -1 });
};

AnalyticsSchema.statics.getByDateRange = function(startDate, endDate, period = 'daily') {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    period
  }).sort({ date: 1 });
};

AnalyticsSchema.statics.getTrends = function(period = 'daily', days = 30) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    period
  }).sort({ date: 1 });
};

AnalyticsSchema.statics.getTopDrivers = function(period = 'daily', limit = 10) {
  return this.findOne({ period })
    .sort({ date: -1 })
    .then(record => {
      if (!record) return [];
      return record.breakdown.byDriver
        .sort((a, b) => b.orders - a.orders)
        .slice(0, limit);
    });
};

AnalyticsSchema.statics.getPerformanceAlerts = function() {
  return this.find({
    'alerts.resolved': false,
    'alerts.severity': { $in: ['high', 'critical'] }
  }).sort({ date: -1 });
};

AnalyticsSchema.statics.generateReport = function(startDate, endDate, period = 'daily') {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    period
  }).sort({ date: 1 });
};

AnalyticsSchema.statics.cleanupOldRecords = function(daysOld = 365) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    date: { $lt: cutoffDate },
    period: { $in: ['hourly', 'daily'] }
  });
};

export const Analytics = mongoose.model('Analytics', AnalyticsSchema);
export default Analytics;
