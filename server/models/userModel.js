// server/models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['Super Admin', 'Admin', 'Salesperson'], // <-- UPDATED
    required: true,
    default: 'Salesperson' // <-- UPDATED
  },
  status: { type: String, default: 'pending' },
  
  mustChangePassword: {
    type: Boolean,
    default: false,
  },

  emailSettings: {
    notificationsEnabled: { type: Boolean, default: true },
    notificationTime: { type: String, default: '08:00' }
  },
  
  // --- NEW: For Dashboard Preferences ---
  dashboardPreferences: {
    timeRange: { type: String, default: 'all' },
    selectedCategory: { type: String, default: '' },
    selectedSupplier: { type: String, default: '' },
    // You could add chart types here in the future
  },
  // --- END NEW ---

  hasPendingChanges: {
    type: Boolean,
    default: false,
  },
  pendingChanges: {
    fullName: { type: String },
    username: { type: String },
    email: { type: String },
    password: { type: String }, 
  },

  verificationCode: {
    type: String,
  },
  verificationCodeExpires: {
    type: Date,
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password.length < 50) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);