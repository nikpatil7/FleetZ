import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: { 
      type: String, 
      required: [true, 'Vehicle number is required'],
      unique: true, 
      index: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/, 'Please enter a valid vehicle number']
    },
    type: { 
      type: String, 
      enum: {
        values: ['bike', 'scooter', 'car', 'van', 'truck', 'cycle'],
        message: 'Vehicle type must be bike, scooter, car, van, truck, or cycle'
      },
      required: [true, 'Vehicle type is required'],
      index: true
    },
    make: { 
      type: String, 
      required: [true, 'Vehicle make is required'],
      trim: true,
      maxlength: [50, 'Make cannot exceed 50 characters']
    },
    model: { 
      type: String, 
      required: [true, 'Vehicle model is required'],
      trim: true,
      maxlength: [50, 'Model cannot exceed 50 characters']
    },
    year: { 
      type: Number, 
      min: [1900, 'Year must be after 1900'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
    },
    color: { 
      type: String, 
      trim: true,
      maxlength: [30, 'Color cannot exceed 30 characters']
    },
    capacity: { 
      type: Number, 
      default: 0,
      min: [0, 'Capacity cannot be negative']
    },
    maxWeight: { 
      type: Number, 
      min: [0, 'Max weight cannot be negative']
    },
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'],
      default: 'petrol'
    },
    currentDriver: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      index: true 
    },
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    trackingEnabled: { 
      type: Boolean, 
      default: true 
    },
    status: {
      type: String,
      enum: ['available', 'in_use', 'maintenance', 'out_of_service'],
      default: 'available',
      index: true
    },
    insurance: {
      policyNumber: { type: String, trim: true },
      provider: { type: String, trim: true },
      expiryDate: Date,
      isActive: { type: Boolean, default: true }
    },
    registration: {
      number: { type: String, trim: true, uppercase: true },
      expiryDate: Date,
      isActive: { type: Boolean, default: true }
    },
    location: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
      address: { type: String, trim: true },
      lastUpdated: { type: Date, default: Date.now }
    },
    odometer: {
      current: { type: Number, default: 0, min: 0 },
      lastService: { type: Number, default: 0, min: 0 },
      serviceInterval: { type: Number, default: 5000, min: 0 }
    },
    maintenance: [{
      type: { type: String, required: true },
      description: { type: String, trim: true },
      cost: { type: Number, min: 0 },
      date: { type: Date, default: Date.now },
      odometer: { type: Number, min: 0 },
      nextDue: Date
    }],
    documents: [{
      type: { type: String, enum: ['insurance', 'registration', 'puc', 'fitness', 'other'] },
      number: { type: String, trim: true },
      expiryDate: Date,
      fileUrl: { type: String, trim: true }
    }],
    features: [{
      type: String,
      enum: ['gps', 'camera', 'alarm', 'air_conditioning', 'power_steering', 'abs', 'airbag']
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
VehicleSchema.index({ type: 1, status: 1 });
VehicleSchema.index({ currentDriver: 1, status: 1 });
VehicleSchema.index({ isActive: 1, trackingEnabled: 1 });
VehicleSchema.index({ 'location.lat': 1, 'location.lng': 1 });
VehicleSchema.index({ 'insurance.expiryDate': 1 });
VehicleSchema.index({ 'registration.expiryDate': 1 });

// Virtual for is available
VehicleSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.status === 'available' && this.trackingEnabled;
});

// Virtual for needs maintenance
VehicleSchema.virtual('needsMaintenance').get(function() {
  if (!this.odometer.current || !this.odometer.lastService || !this.odometer.serviceInterval) {
    return false;
  }
  return (this.odometer.current - this.odometer.lastService) >= this.odometer.serviceInterval;
});

// Virtual for insurance expiry
VehicleSchema.virtual('insuranceExpired').get(function() {
  if (!this.insurance.expiryDate) return false;
  return new Date() > this.insurance.expiryDate;
});

// Virtual for registration expiry
VehicleSchema.virtual('registrationExpired').get(function() {
  if (!this.registration.expiryDate) return false;
  return new Date() > this.registration.expiryDate;
});

// Pre-save middleware to update location timestamp
VehicleSchema.pre('save', function(next) {
  if (this.isModified('location.lat') || this.isModified('location.lng')) {
    this.location.lastUpdated = new Date();
  }
  next();
});

// Instance methods
VehicleSchema.methods.updateLocation = async function(lat, lng, address = null) {
  this.location.lat = lat;
  this.location.lng = lng;
  this.location.address = address;
  this.location.lastUpdated = new Date();
  return this.save();
};

VehicleSchema.methods.assignDriver = async function(driverId) {
  this.currentDriver = driverId;
  this.status = 'in_use';
  return this.save();
};

VehicleSchema.methods.releaseDriver = async function() {
  this.currentDriver = null;
  this.status = 'available';
  return this.save();
};

VehicleSchema.methods.updateOdometer = async function(reading) {
  this.odometer.current = reading;
  return this.save();
};

VehicleSchema.methods.addMaintenance = async function(maintenanceData) {
  this.maintenance.push(maintenanceData);
  this.odometer.lastService = this.odometer.current;
  return this.save();
};

VehicleSchema.methods.isNearLocation = function(lat, lng, radiusKm = 1) {
  if (!this.location.lat || !this.location.lng) return false;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat - this.location.lat) * Math.PI / 180;
  const dLng = (lng - this.location.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.location.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance <= radiusKm;
};

// Static methods
VehicleSchema.statics.findAvailable = function() {
  return this.find({ 
    isActive: true, 
    status: 'available',
    trackingEnabled: true 
  });
};

VehicleSchema.statics.findByType = function(type) {
  return this.find({ type, isActive: true });
};

VehicleSchema.statics.findNearLocation = function(lat, lng, radiusKm = 5) {
  return this.find({
    isActive: true,
    trackingEnabled: true,
    'location.lat': { $exists: true },
    'location.lng': { $exists: true }
  }).where('location').near({
    center: { type: 'Point', coordinates: [lng, lat] },
    maxDistance: radiusKm * 1000, // Convert to meters
    spherical: true
  });
};

VehicleSchema.statics.findNeedingMaintenance = function() {
  return this.find({
    isActive: true,
    $expr: {
      $gte: [
        { $subtract: ['$odometer.current', '$odometer.lastService'] },
        '$odometer.serviceInterval'
      ]
    }
  });
};

VehicleSchema.statics.findWithExpiredDocuments = function() {
  const today = new Date();
  return this.find({
    isActive: true,
    $or: [
      { 'insurance.expiryDate': { $lt: today } },
      { 'registration.expiryDate': { $lt: today } }
    ]
  });
};

export const Vehicle = mongoose.model('Vehicle', VehicleSchema);
export default Vehicle;

