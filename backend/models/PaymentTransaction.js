const mongoose = require('mongoose');

const PaymentTransactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD']
  },
  status: {
    type: String,
    enum: ['created', 'pending', 'authorized', 'captured', 'refunded', 'failed', 'cancelled'],
    default: 'created'
  },
  paymentMethod: {
    type: String,
    default: null // card, netbanking, upi, wallet, etc.
  },
  paymentMethodDetails: {
    type: {
      type: String, // card, netbanking, upi, etc.
      default: null
    },
    cardType: String, // visa, mastercard, etc.
    bank: String,
    wallet: String,
    vpa: String // for UPI
  },
  refundDetails: {
    refundAmount: {
      type: Number,
      default: 0
    },
    refundId: String,
    refundReason: String,
    refundedAt: Date,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  failureReason: {
    type: String,
    default: null
  },
  // Razorpay webhook data
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Additional metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceInfo: String
  },
  // Timestamps
  paidAt: Date,
  capturedAt: Date,
  refundedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
PaymentTransactionSchema.index({ orderId: 1 });
PaymentTransactionSchema.index({ userId: 1 });
PaymentTransactionSchema.index({ razorpayOrderId: 1 });
PaymentTransactionSchema.index({ razorpayPaymentId: 1 });
PaymentTransactionSchema.index({ status: 1 });
PaymentTransactionSchema.index({ createdAt: -1 });

// Virtual for checking if payment is successful
PaymentTransactionSchema.virtual('isSuccessful').get(function() {
  return ['authorized', 'captured'].includes(this.status);
});

// Virtual for checking if payment can be refunded
PaymentTransactionSchema.virtual('canRefund').get(function() {
  return this.status === 'captured' && this.refundDetails.refundAmount < this.amount;
});

// Instance method to calculate refundable amount
PaymentTransactionSchema.methods.getRefundableAmount = function() {
  if (!this.canRefund) return 0;
  return this.amount - (this.refundDetails.refundAmount || 0);
};

// Static method to find by Razorpay order ID
PaymentTransactionSchema.statics.findByRazorpayOrderId = function(razorpayOrderId) {
  return this.findOne({ razorpayOrderId });
};

// Static method to get user payment history
PaymentTransactionSchema.statics.getUserPaymentHistory = function(userId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const skip = (page - 1) * limit;
  
  const query = { userId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('orderId', 'orderNumber totalAmount orderStatus')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Pre-save middleware for validation
PaymentTransactionSchema.pre('save', function(next) {
  // Set paidAt when status changes to authorized or captured
  if (this.isModified('status') && ['authorized', 'captured'].includes(this.status) && !this.paidAt) {
    this.paidAt = new Date();
  }
  
  // Set capturedAt when status changes to captured
  if (this.isModified('status') && this.status === 'captured' && !this.capturedAt) {
    this.capturedAt = new Date();
  }
  
  next();
});

// Post-save middleware for logging
PaymentTransactionSchema.post('save', function(doc, next) {
  console.log(`Payment transaction ${doc._id} saved with status: ${doc.status}`);
  next();
});

module.exports = mongoose.model('PaymentTransaction', PaymentTransactionSchema);