import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    riderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: [true, 'Rider ID is required'],
      index: true 
    },
    vehicleId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Vehicle',
      index: true 
    },
    coords: { 
      lat: { 
        type: Number, 
        required: [true, 'Latitude is required'],
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      }, 
      lng: { 
        type: Number, 
        required: [true, 'Longitude is required'],
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    accuracy: {
      type: Number,
      min: [0, 'Accuracy cannot be negative'],
      max: [100, 'Accuracy cannot exceed 100 meters']
    },
    speed: { 
      type: Number, 
      min: [0, 'Speed cannot be negative'],
      max: [300, 'Speed cannot exceed 300 km/h']
    },
    heading: { 
      type: Number, 
      min: [0, 'Heading must be between 0 and 360'],
      max: [360, 'Heading must be between 0 and 360']
    },
    altitude: {
      type: Number,
      min: [-1000, 'Altitude cannot be below -1000 meters'],
      max: [10000, 'Altitude cannot exceed 10000 meters']
    },
    batteryLevel: {
      type: Number,
      min: [0, 'Battery level cannot be negative'],
      max: [100, 'Battery level cannot exceed 100%']
    },
    isCharging: {
      type: Boolean,
      default: false
    },
    networkType: {
      type: String,
      enum: ['wifi', '4g', '3g', '2g', 'unknown'],
      default: 'unknown'
    },
    signalStrength: {
      type: Number,
      min: [-120, 'Signal strength cannot be below -120 dBm'],
      max: [0, 'Signal strength cannot exceed 0 dBm']
    },
    ts: { 
      type: Date, 
      default: Date.now, 
      index: true 
    },
    sessionId: {
      type: String,
      index: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    metadata: {
      appVersion: { type: String, trim: true },
      osVersion: { type: String, trim: true },
      deviceModel: { type: String, trim: true },
      source: { 
        type: String, 
        enum: ['gps', 'network', 'passive', 'manual'],
        default: 'gps'
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for better query performance
LocationSchema.index({ riderId: 1, ts: -1 });
LocationSchema.index({ vehicleId: 1, ts: -1 });
LocationSchema.index({ sessionId: 1, ts: -1 });
LocationSchema.index({ isActive: 1, ts: -1 });
LocationSchema.index({ 
  'coords.lat': 1, 
  'coords.lng': 1, 
  ts: -1 
});

// Geospatial index for location-based queries
LocationSchema.index({ 
  'coords': '2dsphere' 
});

// Virtual for formatted timestamp
LocationSchema.virtual('formattedTime').get(function() {
  return this.ts.toISOString();
});

// Virtual for speed in different units
LocationSchema.virtual('speedMph').get(function() {
  return this.speed ? (this.speed * 0.621371) : null;
});

// Virtual for distance from a point (to be calculated)
LocationSchema.virtual('distanceFromPoint').get(function() {
  return null; // This would be calculated when needed
});

// Pre-save middleware to validate coordinates
LocationSchema.pre('save', function(next) {
  // Validate that coordinates are within valid ranges
  if (this.coords.lat < -90 || this.coords.lat > 90) {
    return next(new Error('Invalid latitude'));
  }
  if (this.coords.lng < -180 || this.coords.lng > 180) {
    return next(new Error('Invalid longitude'));
  }
  next();
});

// Instance methods
LocationSchema.methods.calculateDistance = function(lat, lng) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat - this.coords.lat) * Math.PI / 180;
  const dLng = (lng - this.coords.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.coords.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

LocationSchema.methods.isNearLocation = function(lat, lng, radiusKm = 1) {
  const distance = this.calculateDistance(lat, lng);
  return distance <= radiusKm;
};

LocationSchema.methods.toGeoJSON = function() {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [this.coords.lng, this.coords.lat]
    },
    properties: {
      riderId: this.riderId,
      vehicleId: this.vehicleId,
      speed: this.speed,
      heading: this.heading,
      timestamp: this.ts,
      address: this.address,
      accuracy: this.accuracy
    }
  };
};

// Static methods
LocationSchema.statics.findByRider = function(riderId, limit = 100) {
  return this.find({ riderId, isActive: true })
    .sort({ ts: -1 })
    .limit(limit);
};

LocationSchema.statics.findByVehicle = function(vehicleId, limit = 100) {
  return this.find({ vehicleId, isActive: true })
    .sort({ ts: -1 })
    .limit(limit);
};

LocationSchema.statics.findLatestByRider = function(riderId) {
  return this.findOne({ riderId, isActive: true })
    .sort({ ts: -1 });
};

LocationSchema.statics.findInTimeRange = function(riderId, startTime, endTime) {
  return this.find({
    riderId,
    ts: { $gte: startTime, $lte: endTime },
    isActive: true
  }).sort({ ts: 1 });
};

LocationSchema.statics.findNearLocation = function(lat, lng, radiusKm = 5, limit = 50) {
  return this.find({
    isActive: true,
    coords: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000 // Convert to meters
      }
    }
  }).limit(limit);
};

LocationSchema.statics.findBySession = function(sessionId) {
  return this.find({ sessionId, isActive: true })
    .sort({ ts: 1 });
};

LocationSchema.statics.getRiderPath = function(riderId, startTime, endTime) {
  return this.find({
    riderId,
    ts: { $gte: startTime, $lte: endTime },
    isActive: true
  }).sort({ ts: 1 });
};

LocationSchema.statics.cleanupOldLocations = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    ts: { $lt: cutoffDate },
    isActive: false
  });
};

LocationSchema.statics.getActiveRiders = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.distinct('riderId', {
    ts: { $gte: fiveMinutesAgo },
    isActive: true
  });
};

export const Location = mongoose.model('Location', LocationSchema);
export default Location;

