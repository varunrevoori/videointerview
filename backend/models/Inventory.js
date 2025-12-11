
const mongoose = require("mongoose");

// Enhanced Inventory Log Schema for detailed tracking
const InventoryLogSchema = new mongoose.Schema({
  toyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Toy",
    required: true,
    index: true
  },
  
  // Change details
  change: {
    type: Number,
    required: true // +5 added, -2 reserved, etc.
  },
  
  previousQuantity: {
    type: Number,
    required: true
  },
  
  newQuantity: {
    type: Number,
    required: true
  },
  
  // Change reason with expanded enum
  reason: {
    type: String,
    enum: [
      "admin-add", 
      "admin-remove", 
      "admin-update",
      "order-reserve", 
      "order-release", 
      "order-delivered",
      "return-received",
      "return-processed",
      "shipment-return",
      "quality-check-pass",
      "quality-check-fail",
      "damage-report",
      "lost-item",
      "system-correction"
    ],
    required: true
  },
  
  // Related documents
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  
  // Additional context
  notes: String,
  
  batchId: String, // For bulk operations
  
  // Metadata
  metadata: {
    location: String, // warehouse location
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
      default: 'good'
    },
    qualityScore: {
      type: Number,
      min: 1,
      max: 10,
      default: 8
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Inventory Alert Schema for low stock notifications
const InventoryAlertSchema = new mongoose.Schema({
  toyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Toy",
    required: true,
    unique: true
  },
  
  alertType: {
    type: String,
    enum: ['low_stock', 'out_of_stock', 'high_demand', 'quality_issue'],
    required: true
  },
  
  alertLevel: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  
  threshold: Number, // The threshold that triggered this alert
  
  currentQuantity: Number,
  
  message: String,
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  
  acknowledgedAt: Date,
  
  resolvedAt: Date
}, {
  timestamps: true
});

// Inventory Reservation Schema for managing reserved items
const InventoryReservationSchema = new mongoose.Schema({
  toyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Toy",
    required: true
  },
  
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'cancelled', 'expired'],
    default: 'active'
  },
  
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  },
  
  fulfilledAt: Date,
  
  cancelledAt: Date,
  
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient queries
InventoryLogSchema.index({ toyId: 1, createdAt: -1 });
InventoryLogSchema.index({ reason: 1 });
InventoryLogSchema.index({ orderId: 1 });
InventoryLogSchema.index({ createdAt: -1 });

InventoryAlertSchema.index({ toyId: 1 });
InventoryAlertSchema.index({ alertType: 1, isActive: 1 });
InventoryAlertSchema.index({ createdAt: -1 });

InventoryReservationSchema.index({ toyId: 1, status: 1 });
InventoryReservationSchema.index({ orderId: 1 });
InventoryReservationSchema.index({ expiresAt: 1 });

// Static methods for InventoryLog
InventoryLogSchema.statics.logChange = async function(toyId, change, reason, context = {}) {
  const Toy = require('./Toy');
  
  // Get current toy state
  const toy = await Toy.findById(toyId);
  if (!toy) {
    throw new Error('Toy not found');
  }
  
  const previousQuantity = toy.availableQuantity;
  const newQuantity = previousQuantity + change;
  
  // Create log entry
  const logEntry = new this({
    toyId,
    change,
    previousQuantity,
    newQuantity,
    reason,
    orderId: context.orderId,
    userId: context.userId,
    adminId: context.adminId,
    notes: context.notes,
    batchId: context.batchId,
    metadata: context.metadata
  });
  
  await logEntry.save();
  
  // Update toy quantity
  toy.availableQuantity = Math.max(0, newQuantity);
  await toy.save();
  
  // Check for alerts
  await this.checkStockAlerts(toyId);
  
  return logEntry;
};

InventoryLogSchema.statics.checkStockAlerts = async function(toyId) {
  const Toy = require('./Toy');
  const InventoryAlert = mongoose.model('InventoryAlert');
  
  const toy = await Toy.findById(toyId);
  if (!toy) return;
  
  const lowStockThreshold = toy.lowStockThreshold || 5;
  
  // Check for existing alerts
  let alert = await InventoryAlert.findOne({ toyId, isActive: true });
  
  if (toy.availableQuantity === 0) {
    // Out of stock alert
    if (!alert || alert.alertType !== 'out_of_stock') {
      if (alert) {
        alert.isActive = false;
        await alert.save();
      }
      
      await InventoryAlert.create({
        toyId,
        alertType: 'out_of_stock',
        alertLevel: 'critical',
        threshold: 0,
        currentQuantity: 0,
        message: `${toy.name} is out of stock`
      });
    }
  } else if (toy.availableQuantity <= lowStockThreshold) {
    // Low stock alert
    if (!alert || alert.alertType !== 'low_stock') {
      if (alert) {
        alert.isActive = false;
        await alert.save();
      }
      
      await InventoryAlert.create({
        toyId,
        alertType: 'low_stock',
        alertLevel: 'warning',
        threshold: lowStockThreshold,
        currentQuantity: toy.availableQuantity,
        message: `${toy.name} is running low (${toy.availableQuantity} remaining)`
      });
    }
  } else {
    // Stock levels are good, resolve any existing alerts
    if (alert) {
      alert.isActive = false;
      alert.resolvedAt = new Date();
      await alert.save();
    }
  }
};

InventoryLogSchema.statics.getToyHistory = function(toyId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ toyId })
    .populate('orderId', 'orderNumber')
    .populate('adminId', 'name email')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static methods for InventoryReservation
InventoryReservationSchema.statics.reserveItems = async function(orderId, items) {
  const reservations = [];
  
  for (const item of items) {
    const reservation = await this.create({
      toyId: item.toyId,
      orderId,
      userId: item.userId,
      quantity: item.quantity,
      notes: item.notes
    });
    
    // Log the reservation
    const InventoryLog = mongoose.model('InventoryLog');
    await InventoryLog.logChange(item.toyId, -item.quantity, 'order-reserve', {
      orderId,
      userId: item.userId,
      notes: 'Item reserved for order'
    });
    
    reservations.push(reservation);
  }
  
  return reservations;
};

InventoryReservationSchema.statics.releaseReservation = async function(orderId) {
  const reservations = await this.find({ orderId, status: 'active' });
  
  for (const reservation of reservations) {
    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date();
    await reservation.save();
    
    // Log the release
    const InventoryLog = mongoose.model('InventoryLog');
    await InventoryLog.logChange(reservation.toyId, reservation.quantity, 'order-release', {
      orderId,
      notes: 'Reservation cancelled/released'
    });
  }
  
  return reservations.length;
};

InventoryReservationSchema.statics.cleanupExpiredReservations = async function() {
  const expiredReservations = await this.find({
    status: 'active',
    expiresAt: { $lt: new Date() }
  });
  
  for (const reservation of expiredReservations) {
    reservation.status = 'expired';
    await reservation.save();
    
    // Log the expiration and release inventory
    const InventoryLog = mongoose.model('InventoryLog');
    await InventoryLog.logChange(reservation.toyId, reservation.quantity, 'order-release', {
      orderId: reservation.orderId,
      notes: 'Reservation expired and released'
    });
  }
  
  return expiredReservations.length;
};

// Auto-cleanup expired reservations (run periodically)
setInterval(async () => {
  try {
    const InventoryReservation = mongoose.model('InventoryReservation');
    const cleaned = await InventoryReservation.cleanupExpiredReservations();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired reservations`);
    }
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
  }
}, 60 * 60 * 1000); // Run every hour

module.exports = {
  InventoryLog: mongoose.model("InventoryLog", InventoryLogSchema),
  InventoryAlert: mongoose.model("InventoryAlert", InventoryAlertSchema),
  InventoryReservation: mongoose.model("InventoryReservation", InventoryReservationSchema)
};
