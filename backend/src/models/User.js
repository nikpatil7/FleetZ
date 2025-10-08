import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'],
      unique: true, 
      index: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: { 
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    role: { 
      type: String, 
      enum: {
        values: ['admin', 'manager', 'driver'],
        message: 'Role must be admin, manager, or driver'
      },
      required: [true, 'Role is required'], 
      index: true 
    },
    passwordHash: { 
      type: String, 
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    vehicle: {
      type: { 
        type: String,
        enum: ['bike', 'scooter', 'car', 'van', 'truck'],
        default: 'bike'
      },
      plate: { 
        type: String,
        uppercase: true,
        trim: true
      },
    },
    status: { 
      type: String, 
      enum: {
        values: ['active', 'inactive', 'on_trip', 'offline'],
        message: 'Status must be active, inactive, on_trip, or offline'
      },
      default: 'active',
      index: true
    },
    lastSeen: { 
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    profileImage: {
      type: String,
      default: null
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'India' }
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    licenseNumber: {
      type: String,
      sparse: true,
      unique: true
    },
    licenseExpiry: Date,
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 }
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      },
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'Asia/Kolkata' }
    },
    tokenVersion: {
      type: Number,
      default: 0,
      index: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ lastSeen: -1 });
UserSchema.index({ 'vehicle.plate': 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for isOnline (last seen within 5 minutes)
UserSchema.virtual('isOnline').get(function() {
  if (!this.lastSeen) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastSeen > fiveMinutesAgo;
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  // Skip hashing if passwordHash is already hashed (starts with $2b$)
  if (this.passwordHash.startsWith('$2b$')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
UserSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

UserSchema.methods.updateLastSeen = async function() {
  this.lastSeen = new Date();
  return this.save();
};

UserSchema.methods.updateStatus = async function(status) {
  this.status = status;
  return this.save();
};

UserSchema.methods.updateRating = async function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

UserSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  return userObject;
};

// Static methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveDrivers = function() {
  return this.find({ 
    role: 'driver', 
    status: { $in: ['active', 'on_trip'] },
    isActive: true 
  });
};

UserSchema.statics.findAvailableDrivers = function() {
  return this.find({ 
    role: 'driver', 
    status: 'active',
    isActive: true 
  });
};

export const User = mongoose.model('User', UserSchema);
export default User;

