// server/controllers/permissionController.js
const { RolePermission, AllPermissions } = require('../models/permissionModel');
const logAction = require('../utils/logger');

// --- MASTER LIST OF ALL PERMISSIONS ---
// This list defines every permission in the system.
// We will "seed" this into the database.
const MASTER_PERMISSION_LIST = [
  // General
  { key: 'canViewDashboard', description: 'Can view the main dashboard', category: 'General', defaultRoles: ['Admin', 'Salesperson'] },
  { key: 'canViewReports', description: 'Can view and generate reports', category: 'General', defaultRoles: ['Admin'] },

  // Sales
  { key: 'canManageSales', description: 'Can create and manage sales (POS)', category: 'Sales', defaultRoles: ['Admin', 'Salesperson'] },
  { key: 'canManageReturns', description: 'Can process customer returns', category: 'Sales', defaultRoles: ['Admin'] },
  { key: 'canManageCustomers', description: 'Can create/edit/delete customers', category: 'Sales', defaultRoles: ['Admin', 'Salesperson'] },
  { key: 'canManageMotorcycles', description: 'Can create/edit/delete motorcycles', category: 'Sales', defaultRoles: ['Admin', 'Salesperson'] },
  { key: 'canManageServices', description: 'Can create/edit/delete services', category: 'Sales', defaultRoles: ['Admin'] },

  // Inventory
  { key: 'canViewInventory', description: 'Can view product list and stock levels', category: 'Inventory', defaultRoles: ['Admin', 'Salesperson'] },
  { key: 'canManageInventory', description: 'Can create/edit/archive products', category: 'Inventory', defaultRoles: ['Admin'] },
  { key: 'canAdjustStock', description: 'Can perform manual stock adjustments', category: 'Inventory', defaultRoles: ['Admin'] },

  // Suppliers
  { key: 'canViewSuppliers', description: 'Can view supplier list', category: 'Suppliers', defaultRoles: ['Admin'] },
  { key: 'canManageSuppliers', description: 'Can create/edit/delete suppliers', category: 'Suppliers', defaultRoles: ['Admin'] },
  { key: 'canManagePurchaseOrders', description: 'Can create/approve/receive POs', category: 'Suppliers', defaultRoles: ['Admin'] },
  { key: 'canManageDeliveries', description: 'Can record direct deliveries', category: 'Suppliers', defaultRoles: ['Admin'] },
];
// --- END OF MASTER LIST ---


/**
 * @desc    Get the master list of all available permissions
 * @route   GET /api/permissions/all
 * @access  Super Admin
 */
const getAllPermissions = async (req, res) => {
  try {
    const allPermissions = await AllPermissions.find({}).sort({ category: 1, key: 1 });
    // --- ADDED CHECK ---
    // If the master list is empty, it means seeding hasn't happened.
    if (!allPermissions || allPermissions.length === 0) {
        return res.status(404).json({ message: 'Permissions master list not found. Please seed permissions.' });
    }
    res.json(allPermissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching permissions list.', error: error.message });
  }
};

/**
 * @desc    Get the list of allowed permission keys for a role
 * @route   GET /api/permissions/:role
 * @access  Super Admin
 */
const getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    if (role !== 'Admin' && role !== 'Salesperson') {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const rolePerms = await RolePermission.findOne({ role });
    if (!rolePerms) {
      // This is the 404 error you are seeing, which is correct before seeding.
      return res.status(404).json({ message: 'Permissions for this role not found.' });
    }
    res.json(rolePerms);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching role permissions.', error: error.message });
  }
};

/**
 * @desc    Update the list of allowed permission keys for a role
 * @route   PUT /api/permissions/:role
 * @access  Super Admin
 */
const updateRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;
    const { allowedPermissions } = req.body; // Expects an array of permission keys

    if (role !== 'Admin' && role !== 'Salesperson') {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    if (!Array.isArray(allowedPermissions)) {
      return res.status(400).json({ message: 'allowedPermissions must be an array.' });
    }

    // Find the role's permissions document and update it, or create it if it doesn't exist
    const updatedRolePerms = await RolePermission.findOneAndUpdate(
      { role },
      { $set: { allowedPermissions } },
      { new: true, upsert: true, runValidators: true }
    );

    logAction(req.user, 'UPDATE_PERMISSIONS', `Updated permissions for role: '${role}'.`, { entityType: 'RolePermission', entityId: updatedRolePerms._id });
    res.json(updatedRolePerms);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating role permissions.', error: error.message });
  }
};

/**
 * @desc    [Admin Only] Seed the AllPermissions collection from the master list
 * @route   POST /api/permissions/seed
 * @access  Super Admin
 */
const seedPermissions = async (req, res) => {
  try {
    // 1. Clear existing permissions to start fresh
    await AllPermissions.deleteMany({});
    
    // 2. Insert the master list
    const createdPermissions = await AllPermissions.insertMany(MASTER_PERMISSION_LIST);

    // 3. Set up the default roles based on the master list
    const defaultAdminPerms = MASTER_PERMISSION_LIST
      .filter(p => p.defaultRoles.includes('Admin'))
      .map(p => p.key);
      
    const defaultSalespersonPerms = MASTER_PERMISSION_LIST
      .filter(p => p.defaultRoles.includes('Salesperson'))
      .map(p => p.key);
      
    // 4. Clear and set default RolePermission documents
    await RolePermission.deleteMany({});
    await RolePermission.create([
      { role: 'Admin', allowedPermissions: defaultAdminPerms },
      { role: 'Salesperson', allowedPermissions: defaultSalespersonPerms }
    ]);
    
    logAction(req.user, 'SEED_PERMISSIONS', 'Successfully seeded and reset all system permissions.');
    res.status(201).json({ 
      message: 'Successfully seeded permissions and reset roles to default.',
      totalPermissions: createdPermissions.length,
      adminDefaults: defaultAdminPerms.length,
      salespersonDefaults: defaultSalespersonPerms.length
    });

  } catch (error) {
    res.status(500).json({ message: 'Error seeding permissions.', error: error.message });
  }
};

/**
 * @desc    Middleware to check if a user's role has a specific permission
 * @usage   checkPermission('canManageInventory')
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    // 1. The 'Super Admin' role bypasses all permission checks
    if (req.user.role === 'Super Admin') {
      return next();
    }

    // 2. For 'Admin' and 'Salesperson', check their permissions
    if (req.user.role === 'Admin' || req.user.role === 'Salesperson') {
      try {
        // Find the permissions document for the user's role
        const rolePerms = await RolePermission.findOne({ role: req.user.role }).lean(); // .lean() for speed

        if (rolePerms && rolePerms.allowedPermissions.includes(requiredPermission)) {
          // 3. User has the permission, proceed
          return next();
        }
        
        // 4. User does not have the permission
        return res.status(403).json({ 
          message: `Forbidden: Your role ('${req.user.role}') does not have the required permission: '${requiredPermission}'.` 
        });

      } catch (error) {
        return res.status(500).json({ message: 'Server error during permission check.' });
      }
    }
    
    // 5. Fallback for any other case
    return res.status(403).json({ message: 'Forbidden. You do not have access.' });
  };
};

module.exports = {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  seedPermissions,
  checkPermission
};