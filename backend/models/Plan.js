
const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  
  // Duration of the plan (e.g., "month", "6 months", "year")
  duration: { type: String, required: true, default: "month" },
  
  // Points allocated for toy selection
  points: { type: Number, required: true },
  
  // Plan features and benefits
  features: [String],
  
  // Whether this is a popular/featured plan
  isPopular: { type: Boolean, default: false },
  
  // Whether this plan is currently available for new subscriptions
  isActive: { type: Boolean, default: true },

  // Maximum toys allowed per category per month
  categoryLimits: {
    sensory: { type: Number, default: 2 },
    "motor-skills": { type: Number, default: 2 },
    "problem-solving": { type: Number, default: 2 },
    crafts: { type: Number, default: 2 },
    books: { type: Number, default: 2 },
    building: { type: Number, default: 2 },
    imaginative: { type: Number, default: 2 },
    outdoor: { type: Number, default: 2 },
    musical: { type: Number, default: 2 },
    science: { type: Number, default: 2 }
  }
}, { timestamps: true });

module.exports = mongoose.model("Plan", PlanSchema);
