
const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  label: { type: String },
  street: { type: String, required: true },
  houseNo: { type: String },
  flatNo: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, default: "India" },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pincode:   { type: String, required: true },

  role: { type: String, enum: ["user", "admin"], default: "user" },

  // Email verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  
  // Password reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  
  // Account status
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },

  addresses: [AddressSchema],
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
