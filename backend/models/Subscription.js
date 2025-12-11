
const mongoose = require("mongoose");

const MonthlyCycleSchema = new mongoose.Schema({
  monthIndex: Number,
  cycleStartDate: Date,
  selectionCutoff: Date,

  // Selected toys with points used
  selectedToys: [{
    toy: { type: mongoose.Schema.Types.ObjectId, ref: "Toy", required: true },
    pointsUsed: { type: Number, required: true },
    selectedAt: { type: Date, default: Date.now }
  }],
  
  // Points tracking for this cycle
  pointsAllocated: { type: Number, required: true }, // Points available for this month
  pointsUsed: { type: Number, default: 0 },           // Points already used
  pointsRemaining: { type: Number },                  // Calculated: pointsAllocated - pointsUsed
  
  // Category-wise toy count tracking
  categoryCount: {
    sensory: { type: Number, default: 0 },
    "motor-skills": { type: Number, default: 0 },
    "problem-solving": { type: Number, default: 0 },
    crafts: { type: Number, default: 0 },
    books: { type: Number, default: 0 },
    building: { type: Number, default: 0 },
    imaginative: { type: Number, default: 0 },
    outdoor: { type: Number, default: 0 },
    musical: { type: Number, default: 0 },
    science: { type: Number, default: 0 }
  },

  // Pre-selection for next month (optional)
  preSelectedToys: [{
    toy: { type: mongoose.Schema.Types.ObjectId, ref: "Toy" },
    pointsRequired: { type: Number },
    preSelectedAt: { type: Date, default: Date.now }
  }],

  reserved: { type: Boolean, default: false },
  shipmentCreated: { type: Boolean, default: false },
  shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Shipment" }
}, { _id: false });

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },

  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },

  pricePaid: Number,
  promoCode: String,

  status: { 
    type: String, 
    enum: ["active", "paused", "cancelled", "completed"], 
    default: "active" 
  },

  monthlyCycles: [MonthlyCycleSchema],

  currentCycleIndex: { type: Number, default: 0 },
  
  // Subscription settings
  autoRenewal: { type: Boolean, default: true },
  
  // Child information for age-appropriate toy recommendations
  childInfo: {
    ageInMonths: { type: Number }, // Child's current age in months
    preferences: [String],          // Preferred toy categories
    lastUpdated: { type: Date }
  }
}, { timestamps: true });

// Method to calculate remaining points for current cycle
SubscriptionSchema.methods.getCurrentCycleRemainingPoints = function() {
  const currentCycle = this.monthlyCycles[this.currentCycleIndex];
  if (!currentCycle) return 0;
  
  return currentCycle.pointsAllocated - currentCycle.pointsUsed;
};

// Method to check if toy can be added to current cycle
SubscriptionSchema.methods.canAddToyToCurrentCycle = function(toy, plan) {
  const currentCycle = this.monthlyCycles[this.currentCycleIndex];
  if (!currentCycle) return { canAdd: false, reason: 'No active cycle' };
  
  // Check points availability
  if (currentCycle.pointsRemaining < toy.points) {
    return { canAdd: false, reason: 'Insufficient points' };
  }
  
  // Check category limit
  const categoryLimit = plan.categoryLimits[toy.category] || 2;
  const currentCategoryCount = currentCycle.categoryCount[toy.category] || 0;
  
  if (currentCategoryCount >= categoryLimit) {
    return { canAdd: false, reason: `Category limit reached (max ${categoryLimit})` };
  }
  
  return { canAdd: true };
};

module.exports = mongoose.model("Subscription", SubscriptionSchema);
