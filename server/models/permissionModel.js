// server/models/permissionModel.js
const mongoose = require('mongoose');

// This defines a single permission, like "canManageInventory"
const permissionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  // We can group permissions for the UI
  category: {
    type: String,
    required: true,
    enum: ['General', 'Inventory', 'Sales', 'Suppliers', 'Admin'],
    default: 'General',
  },
}, { _id: false }); // _id: false because this will be a sub-document

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    unique: true,
    enum: ['Admin', 'Salesperson'], // We only need to store permissions for these roles
  },
  // This is an array of strings that match the 'key' in permissionSchema
  // Example: ['canViewDashboard', 'canManageSales']
  allowedPermissions: {
    type: [String],
    default: [],
  },
});

// We'll export two models:
// 1. RolePermission: To store what each role is allowed to do.
// 2. AllPermissions: A *separate* collection to store the *master list* of all available permissions.

const allPermissionsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['General', 'Inventory', 'Sales', 'Suppliers', 'Admin'],
    default: 'General',
  },
  // This helps us set the default state in the UI
  defaultRoles: {
    type: [String],
    enum: ['Admin', 'Salesperson'],
    default: [],
  },
}, { timestamps: true });


const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);
const AllPermissions = mongoose.model('AllPermission', allPermissionsSchema);

module.exports = { RolePermission, AllPermissions };