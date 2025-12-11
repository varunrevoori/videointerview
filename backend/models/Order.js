const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Subscription Details
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  
  ageGroup: {
    type: String,
    required: true,
    enum: ['6m-2y', '2-3y', '3-4y', '4-6y', '6-8y', '8-12y']
  },
  
  // Order Items (toys)
  items: [{
    toyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Toy',
      required: true
    },
    name: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    points: {
      type: Number,
      default: 1
    },
    priceAtTime: Number, // Price when order was placed
    images: [String]
  }],
  
  // Customer Details
  customerDetails: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  
  // Delivery Address
  shippingAddress: {
    fullName: String,
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    landmark: String,
    phone: String
  },
  
  // Billing Address (if different from shipping)
  billingAddress: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'India' },
    phone: String
  },
  
  // Delivery Preferences
  deliveryPreferences: {
    instructions: String,
    timeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'any'],
      default: 'any'
    },
    preferredDate: Date,
    contactlessDelivery: { type: Boolean, default: false }
  },
  
  // Pricing Breakdown
  pricing: {
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  },
  
  // Promo Code Applied
  appliedPromoCode: {
    code: String,
    discount: Number,
    discountType: { type: String, enum: ['percentage', 'fixed'] }
  },
  
  // Payment Details
  paymentDetails: {
    method: {
      type: String,
      enum: ['razorpay', 'stripe', 'cod', 'wallet'],
      default: 'razorpay'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date,
    paidAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 }
  },
  
  // Order Status with comprehensive states
  orderStatus: {
    type: String,
    enum: [
      'pending_payment',
      'payment_failed', 
      'confirmed',
      'preparing',
      'quality_check',
      'packed',
      'shipped',
      'out_for_delivery',
      'delivered',
      'return_requested',
      'return_approved',
      'pickup_scheduled',
      'picked_up',
      'return_processed',
      'completed',
      'cancelled',
      'refunded'
    ],
    default: 'pending_payment'
  },
  
  // Status History for tracking
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    location: String // For tracking updates
  }],
  
  // Subscription Period
  subscriptionPeriod: {
    startDate: Date,
    endDate: Date,
    duration: String // '1 month', '3 months', etc.
  },
  
  // Shipping & Tracking
  shipping: {
    carrier: String, // 'delhivery', 'bluedart', etc.
    trackingNumber: String,
    shippedAt: Date,
    estimatedDelivery: Date,
    actualDelivery: Date,
    deliveryAttempts: {
      type: Number,
      default: 0
    },
    trackingUrl: String
  },
  
  // Return Information
  returnDetails: {
    isReturnable: { type: Boolean, default: true },
    returnWindow: { type: Number, default: 7 }, // days
    returnDeadline: Date,
    returnReason: String,
    returnStatus: {
      type: String,
      enum: ['not_requested', 'requested', 'approved', 'rejected', 'picked_up', 'processed'],
      default: 'not_requested'
    },
    returnRequestedAt: Date,
    returnProcessedAt: Date
  },
  
  // Quality & Inventory Management
  qualityCheck: {
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'not_required'],
      default: 'pending'
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedAt: Date,
    notes: String,
    images: [String]
  },
  
  // Special Flags
  flags: {
    isUrgent: { type: Boolean, default: false },
    isGift: { type: Boolean, default: false },
    requiresInsurance: { type: Boolean, default: false },
    fragileItems: { type: Boolean, default: false }
  },
  
  // Communication Logs
  communications: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'call', 'notification'],
      required: true
    },
    content: String,
    sentAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      default: 'sent'
    }
  }],
  
  // Internal Notes
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Timestamps for key events
  timestamps: {
    orderPlaced: { type: Date, default: Date.now },
    paymentCompleted: Date,
    preparationStarted: Date,
    qualityChecked: Date,
    packed: Date,
    shipped: Date,
    delivered: Date,
    completed: Date
  },
  
  // System fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
OrderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

OrderSchema.virtual('isDelivered').get(function() {
  return this.orderStatus === 'delivered';
});

OrderSchema.virtual('canBeCancelled').get(function() {
  return ['pending_payment', 'confirmed', 'preparing'].includes(this.orderStatus);
});

OrderSchema.virtual('canBeReturned').get(function() {
  if (!this.returnDetails.isReturnable) return false;
  if (this.orderStatus !== 'delivered') return false;
  
  const now = new Date();
  return now <= this.returnDetails.returnDeadline;
});

OrderSchema.virtual('statusProgress').get(function() {
  const statusOrder = [
    'pending_payment', 'confirmed', 'preparing', 'quality_check', 
    'packed', 'shipped', 'out_for_delivery', 'delivered', 'completed'
  ];
  
  const currentIndex = statusOrder.indexOf(this.orderStatus);
  const totalSteps = statusOrder.length;
  
  return {
    current: Math.max(0, currentIndex),
    total: totalSteps,
    percentage: currentIndex >= 0 ? (currentIndex / (totalSteps - 1)) * 100 : 0
  };
});

// Instance Methods
OrderSchema.methods.updateStatus = async function(newStatus, updatedBy, notes) {
  // Validate status transition
  const validTransitions = {
    'pending_payment': ['confirmed', 'payment_failed', 'cancelled'],
    'payment_failed': ['pending_payment', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['quality_check', 'packed', 'cancelled'],
    'quality_check': ['packed', 'preparing', 'cancelled'],
    'packed': ['shipped', 'preparing'],
    'shipped': ['out_for_delivery', 'delivered'],
    'out_for_delivery': ['delivered', 'return_requested'],
    'delivered': ['return_requested', 'completed'],
    'return_requested': ['return_approved', 'delivered'],
    'return_approved': ['pickup_scheduled'],
    'pickup_scheduled': ['picked_up'],
    'picked_up': ['return_processed'],
    'return_processed': ['refunded'],
    'completed': [], // Terminal state
    'cancelled': [], // Terminal state
    'refunded': []   // Terminal state
  };

  const currentTransitions = validTransitions[this.orderStatus] || [];
  
  if (!currentTransitions.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.orderStatus} to ${newStatus}`);
  }

  // Update status and add to history
  const previousStatus = this.orderStatus;
  this.orderStatus = newStatus;
  
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    notes
  });

  // Update relevant timestamps
  const now = new Date();
  switch (newStatus) {
    case 'confirmed':
      this.timestamps.paymentCompleted = now;
      break;
    case 'preparing':
      this.timestamps.preparationStarted = now;
      break;
    case 'quality_check':
      this.timestamps.qualityChecked = now;
      break;
    case 'packed':
      this.timestamps.packed = now;
      break;
    case 'shipped':
      this.timestamps.shipped = now;
      this.shipping.shippedAt = now;
      break;
    case 'delivered':
      this.timestamps.delivered = now;
      this.shipping.actualDelivery = now;
      // Set return deadline
      if (this.returnDetails.isReturnable) {
        const returnDeadline = new Date(now);
        returnDeadline.setDate(returnDeadline.getDate() + this.returnDetails.returnWindow);
        this.returnDetails.returnDeadline = returnDeadline;
      }
      break;
    case 'completed':
      this.timestamps.completed = now;
      break;
  }

  this.updatedBy = updatedBy;
  await this.save();

  // Trigger post-status-change actions
  await this.handleStatusChangeActions(previousStatus, newStatus);
  
  return this;
};

OrderSchema.methods.handleStatusChangeActions = async function(previousStatus, newStatus) {
  // Inventory management
  if (newStatus === 'confirmed' && previousStatus === 'pending_payment') {
    await this.reserveInventory();
  } else if (newStatus === 'cancelled') {
    await this.releaseInventory();
  } else if (newStatus === 'return_processed') {
    await this.returnInventory();
  }

  // Notifications
  await this.sendStatusNotification(newStatus);
};

OrderSchema.methods.reserveInventory = async function() {
  const Toy = require('./Toy');
  
  for (const item of this.items) {
    await Toy.findByIdAndUpdate(item.toyId, {
      $inc: { 
        availableQuantity: -item.quantity,
        reservedQuantity: item.quantity 
      }
    });
  }
};

OrderSchema.methods.releaseInventory = async function() {
  const Toy = require('./Toy');
  
  for (const item of this.items) {
    await Toy.findByIdAndUpdate(item.toyId, {
      $inc: { 
        availableQuantity: item.quantity,
        reservedQuantity: -item.quantity 
      }
    });
  }
};

OrderSchema.methods.returnInventory = async function() {
  const Toy = require('./Toy');
  
  for (const item of this.items) {
    await Toy.findByIdAndUpdate(item.toyId, {
      $inc: { 
        availableQuantity: item.quantity,
        reservedQuantity: -item.quantity 
      }
    });
  }
};

OrderSchema.methods.sendStatusNotification = async function(status) {
  // This would integrate with your notification system
  console.log(`Sending notification for order ${this.orderNumber} - Status: ${status}`);
};

OrderSchema.methods.calculateProgress = function() {
  return this.statusProgress;
};

// Static Methods
OrderSchema.statics.findByStatus = function(status) {
  return this.find({ orderStatus: status }).populate('userId planId items.toyId');
};

OrderSchema.statics.getOrdersByDateRange = function(startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).populate('userId planId items.toyId');
};

OrderSchema.statics.getUserOrderHistory = function(userId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const skip = (page - 1) * limit;
  
  const query = { userId };
  if (status) query.orderStatus = status;
  
  return this.find(query)
    .populate('planId', 'name duration price')
    .populate('items.toyId', 'name images category')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Pre-save middleware
OrderSchema.pre('save', async function(next) {
  // Generate order number
  if (!this.orderNumber) {
    const orderCount = await mongoose.model('Order').countDocuments();
    this.orderNumber = 'TIQ' + String(orderCount + 1).padStart(6, '0');
  }
  
  // Calculate subscription period
  if (this.subscriptionPeriod.startDate && this.planId) {
    try {
      const Plan = require('./Plan');
      const plan = await Plan.findById(this.planId);
      if (plan && !this.subscriptionPeriod.endDate) {
        const startDate = new Date(this.subscriptionPeriod.startDate);
        const duration = plan.duration || '1 month';
        
        switch (duration) {
          case '1 month':
            this.subscriptionPeriod.endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
            break;
          case '3 months':
            this.subscriptionPeriod.endDate = new Date(startDate.setMonth(startDate.getMonth() + 3));
            break;
          case '6 months':
            this.subscriptionPeriod.endDate = new Date(startDate.setMonth(startDate.getMonth() + 6));
            break;
          case '1 year':
            this.subscriptionPeriod.endDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
            break;
          default:
            this.subscriptionPeriod.endDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
        }
        
        this.subscriptionPeriod.duration = duration;
      }
    } catch (error) {
      console.error('Error calculating subscription period:', error);
    }
  }
  
  next();
});

// Post-save middleware
OrderSchema.post('save', function(doc, next) {
  console.log(`Order ${doc.orderNumber} saved with status: ${doc.orderStatus}`);
  next();
});

// Indexes for efficient queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ 'paymentDetails.status': 1 });
OrderSchema.index({ 'shipping.trackingNumber': 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'timestamps.delivered': -1 });

module.exports = mongoose.model('Order', OrderSchema);