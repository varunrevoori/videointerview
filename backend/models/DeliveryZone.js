
const mongoose = require("mongoose");

const DeliveryZoneSchema = new mongoose.Schema({
  zoneName: { type: String, required: true },
  pincodes: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("DeliveryZone", DeliveryZoneSchema);
