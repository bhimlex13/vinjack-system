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
    enum: ['Owner', 'Clerk', 'Mechanic'],
    required: true,
    default: 'Clerk'
  },
  status: { type: String, default: 'pending' },
  
  // ADDED: Flag to force password change on first login
  mustChangePassword: {
    type: Boolean,
    default: false,
  },

  emailSettings: {
    notificationsEnabled: { type: Boolean, default: true },
    notificationTime: { type: String, default: '08:00' }
  },
  
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
  // Only hash the password if it has been modified and is not already a long hash
  if (this.isModified('password') && this.password.length < 50) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);