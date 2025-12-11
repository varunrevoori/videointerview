
const mongoose = require("mongoose");

const ToySchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String }, // For backward compatibility
  category: { 
    type: String, 
    enum: [
      "sensory",        // Sensory toys for development
      "motor-skills",   // Motor skills development toys
      "problem-solving", // Problem solving and puzzles
      "crafts",         // Crafts and creative making
      "books",          // Educational books and story books
      "building",       // Building blocks and construction
      "imaginative",    // Role play and imaginative toys
      "outdoor",        // Outdoor and physical activity toys
      "musical",        // Musical instruments and sound toys
      "science"         // Science experiment kits
    ], 
    required: true 
  },
  subcategory: { type: String },
  description: { type: String },
  
  // Points required to select this toy
  points: { type: Number, required: true, min: 1 },
  
  // Age range as flexible string (e.g., "3-6 years")
  ageRange: { type: String },

  // Rating information
  rating: {
    type: Number,
    default: 4,
    min: 1,
    max: 5
  },

  images: [String],

  totalQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 },

  visibleZones: [String],  // list of pincodes where toy is available
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isActive: { type: Boolean, default: true }
  
}, { timestamps: true });

module.exports = mongoose.model("Toy", ToySchema);
