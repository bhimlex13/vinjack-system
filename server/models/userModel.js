// server/models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true 
  },
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { 
    type: String, 
    required: true 
  },
  role: {
    type: String,
    enum: ['Owner', 'Clerk', 'Mechanic'],
    required: true,
    default: 'Mechanic',
  },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'inactive'],
    default: 'pending',
  },
  emailSettings: {
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    notificationTime: {
      type: String,
      default: '08:00',
    }
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('User', userSchema);
