import mongoose from 'mongoose';
import crypto from 'crypto';

const AddressSchema = new mongoose.Schema(
  {
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
    },
    address: { 
      type: String, 
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    landmark: { type: String, trim: true },
    instructions: { type: String, trim: true, maxlength: [200, 'Instructions cannot exceed 200 characters'] },
    contactName: { type: String, trim: true },
    contactPhone: { 
      type: String, 
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    }
  },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Item title is required'],
      trim: true,
      maxlength: [100, 'Item title cannot exceed 100 characters']
    },
    qty: { 
      type: Number, 
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      max: [100, 'Quantity cannot exceed 100']
    },
    price: { 
      type: Number, 
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    weight: { type: Number, min: 0 }, // in kg
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 }
    },
    description: { type: String, trim: true, maxlength: [200, 'Description cannot exceed 200 characters'] },
    category: { 
      type: String, 
      enum: ['food', 'electronics', 'clothing', 'documents', 'fragile', 'other'],
      default: 'other'
    }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    trackingNumber: { 
      type: String, 
      unique: true, 
      index: true, 
      required: false,
      uppercase: true
    },
    orderNumber: { 
      type: String, 
      unique: true, 
      index: true,
      uppercase: true
    },
    customerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: [true, 'Customer is required']
    },
    customerInfo: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true }
    },
    items: [ItemSchema],
    pickup: {
      type: AddressSchema,
      required: [true, 'Pickup address is required']
    },
    dropoff: {
      type: AddressSchema,
      required: [true, 'Dropoff address is required']
    },
    assignedRiderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      index: true 
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'],
        message: 'Invalid status'
      },
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true
    },
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    scheduledPickupTime: Date,
    scheduledDeliveryTime: Date,
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, 'Delivery fee cannot be negative']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'online'],
      default: 'cash'
    },
    distance: {
      type: Number, // in kilometers
      min: 0
    },
    estimatedDuration: {
      type: Number, // in minutes
      min: 0
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Special instructions cannot exceed 500 characters']
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    failureReason: {
      type: String,
      trim: true
    },
    rating: {
      customer: { type: Number, min: 1, max: 5 },
      driver: { type: Number, min: 1, max: 5 },
      feedback: { type: String, trim: true, maxlength: [500, 'Feedback cannot exceed 500 characters'] }
    },
    timeline: [{
      status: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      note: { type: String, trim: true },
      location: {
        lat: Number,
        lng: Number,
        address: String
      }
    }],
    isUrgent: {
      type: Boolean,
      default: false,
      index: true
    },
    requiresSignature: {
      type: Boolean,
      default: false
    },
    signature: {
      type: String, // base64 encoded signature image
      default: null
    },
    proofOfDelivery: [{
      type: { type: String, enum: ['photo', 'signature', 'otp'] },
      data: String, // base64 encoded image or OTP
      timestamp: { type: Date, default: Date.now }
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ assignedRiderId: 1, status: 1 });
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ 'pickup.lat': 1, 'pickup.lng': 1 });
OrderSchema.index({ 'dropoff.lat': 1, 'dropoff.lng': 1 });
OrderSchema.index({ isUrgent: 1, status: 1 });
OrderSchema.index({ estimatedDeliveryTime: 1 });

// Virtual for order age in hours
OrderSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for total items count
OrderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.qty, 0);
});

// Virtual for is overdue
OrderSchema.virtual('isOverdue').get(function() {
  if (!this.estimatedDeliveryTime) return false;
  return new Date() > this.estimatedDeliveryTime && this.status !== 'delivered';
});

// Pre-save middleware to generate tracking and order numbers
OrderSchema.pre('save', async function(next) {
  if (!this.trackingNumber) {
    this.trackingNumber = crypto.randomBytes(6).toString('hex').toUpperCase();
  }
  
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD${year}${month}${day}${random}`;
  }
  
  next();
});

// Pre-save middleware to update timeline
OrderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      note: this.status === 'cancelled' ? this.cancellationReason : 
            this.status === 'failed' ? this.failureReason : null
    });
  }
  next();
});

// Instance methods
OrderSchema.methods.updateStatus = async function(status, note = null, location = null) {
  this.status = status;
  
  if (status === 'delivered') {
    this.actualDeliveryTime = new Date();
  }
  
  this.timeline.push({
    status,
    timestamp: new Date(),
    note,
    location
  });
  
  return this.save();
};

OrderSchema.methods.assignDriver = async function(driverId) {
  this.assignedRiderId = driverId;
  this.status = 'assigned';
  
  this.timeline.push({
    status: 'assigned',
    timestamp: new Date(),
    note: `Assigned to driver ${driverId}`
  });
  
  return this.save();
};

OrderSchema.methods.calculateDistance = function() {
  if (!this.pickup.lat || !this.pickup.lng || !this.dropoff.lat || !this.dropoff.lng) {
    return 0;
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (this.dropoff.lat - this.pickup.lat) * Math.PI / 180;
  const dLng = (this.dropoff.lng - this.pickup.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.pickup.lat * Math.PI / 180) * Math.cos(this.dropoff.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
};

// Static methods
OrderSchema.statics.findByTrackingNumber = function(trackingNumber) {
  return this.findOne({ trackingNumber: trackingNumber.toUpperCase() });
};

OrderSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

OrderSchema.statics.findByDriver = function(driverId) {
  return this.find({ assignedRiderId: driverId }).sort({ createdAt: -1 });
};

OrderSchema.statics.findUnassigned = function() {
  return this.find({ 
    status: 'pending',
    assignedRiderId: { $exists: false }
  }).sort({ createdAt: -1 });
};

OrderSchema.statics.findOverdue = function() {
  return this.find({
    estimatedDeliveryTime: { $lt: new Date() },
    status: { $nin: ['delivered', 'cancelled'] }
  }).sort({ estimatedDeliveryTime: 1 });
};

export const Order = mongoose.model('Order', OrderSchema);
export default Order;

