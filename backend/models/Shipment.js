
const mongoose = require("mongoose");

const ShipmentSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  monthIndex: Number,

  toys: [
    {
      toyId: { type: mongoose.Schema.Types.ObjectId, ref: "Toy" },
      title: String
    }
  ],

  shippingAddress: {
    street: String,
    houseNo: String,
    flatNo: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },

  shipmentStatus: {
    type: String,
    enum: ["pending", "shipped", "delivered", "returned"],
    default: "pending"
  },

  trackingId: String,
  shippedAt: Date,
  deliveredAt: Date,

}, { timestamps: true });

module.exports = mongoose.model("Shipment", ShipmentSchema);
