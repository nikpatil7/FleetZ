import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true
    },
    type: {
      type: String,
      enum: {
        values: ['order_assigned', 'order_status_update', 'order_delivered', 'order_cancelled', 
                'driver_assigned', 'driver_location_update', 'payment_received', 'payment_failed',
                'system_alert', 'maintenance_due', 'document_expiry', 'rating_received',
                'emergency', 'general'],
        message: 'Invalid notification type'
      },
      required: [true, 'Notification type is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    data: {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
      amount: { type: Number },
      location: {
        lat: { type: Number },
        lng: { type: Number },
        address: { type: String }
      },
      metadata: mongoose.Schema.Types.Mixed
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
      index: true
    },
    channels: [{
      type: {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
        default: 'pending'
      },
      sentAt: Date,
      deliveredAt: Date,
      readAt: Date,
      error: String
    }],
    scheduledAt: {
      type: Date,
      index: true
    },
    expiresAt: {
      type: Date,
      index: true
    },
    readAt: {
      type: Date,
      index: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    retryCount: {
      type: Number,
      default: 0,
      max: [5, 'Maximum retry count exceeded']
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1 });
NotificationSchema.index({ priority: 1, scheduledAt: 1 });
NotificationSchema.index({ isRead: 1, isArchived: 1 });

// Virtual for age in hours
NotificationSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for is expired
NotificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Virtual for is scheduled
NotificationSchema.virtual('isScheduled').get(function() {
  return this.scheduledAt && new Date() < this.scheduledAt;
});

// Pre-save middleware to set expiration if not provided
NotificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set default expiration to 30 days
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Instance methods
NotificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsUnread = async function() {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

NotificationSchema.methods.archive = async function() {
  this.isArchived = true;
  return this.save();
};

NotificationSchema.methods.unarchive = async function() {
  this.isArchived = false;
  return this.save();
};

NotificationSchema.methods.updateChannelStatus = async function(channelType, status, error = null) {
  const channel = this.channels.find(c => c.type === channelType);
  if (channel) {
    channel.status = status;
    if (status === 'sent') channel.sentAt = new Date();
    if (status === 'delivered') channel.deliveredAt = new Date();
    if (status === 'read') channel.readAt = new Date();
    if (error) channel.error = error;
  }
  return this.save();
};

// Static methods
NotificationSchema.statics.findByRecipient = function(recipientId, options = {}) {
  const query = { recipientId, isArchived: false };
  
  if (options.unreadOnly) {
    query.isRead = false;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

NotificationSchema.statics.findPending = function() {
  return this.find({
    status: 'pending',
    scheduledAt: { $lte: new Date() },
    expiresAt: { $gt: new Date() }
  }).sort({ priority: -1, createdAt: 1 });
};

NotificationSchema.statics.findByType = function(type, limit = 100) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(limit);
};

NotificationSchema.statics.markAllAsRead = function(recipientId) {
  return this.updateMany(
    { recipientId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

NotificationSchema.statics.getUnreadCount = function(recipientId) {
  return this.countDocuments({
    recipientId,
    isRead: false,
    isArchived: false,
    expiresAt: { $gt: new Date() }
  });
};

NotificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

NotificationSchema.statics.createBulk = function(notifications) {
  return this.insertMany(notifications);
};

export const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
