
const mongoose = require("mongoose");

const AdminActionLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: String, // "ADD_TOY", "EDIT_TOY", "DELETE_TOY", etc.
  details: mongoose.Schema.Types.Mixed, // store payload
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AdminActionLog", AdminActionLogSchema);
