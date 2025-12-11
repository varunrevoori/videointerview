
const mongoose = require("mongoose");

const PromoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },

  discountPercent: Number,
  discountAmount: Number,

  maxUses: Number,
  usedCount: { type: Number, default: 0 },

  validFrom: Date,
  validTo: Date,

  applicablePlans: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plan" }],
  minOrderValue: Number
}, { timestamps: true });

module.exports = mongoose.model("PromoCode", PromoCodeSchema);
