// server/controllers/productController.js
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify, getStockStatus } = require('../utils/stockManager');
const { createNotification } = require('../utils/notificationManager');

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      // --- MODIFICATION START ---
      // Select the suppliers field and populate it
      .select('itemCode name category brand cost price quantity image maxStock stockStatus suppliers')
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('suppliers', 'name'); // <-- ADD THIS LINE TO POPULATE SUPPLIERS
      // --- MODIFICATION END ---

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// --- createProduct function (No changes needed, should already save suppliers) ---
const createProduct = async (req, res) => {
  const io = req.app.get('socketio');
  try {
    // Make sure suppliers is destructured here
    const { name, itemCode, category, brand, cost, price, quantity, unit, image, suppliers, maxStock } = req.body;

    const newProduct = new Product({
      name, itemCode, category, brand, cost, price, quantity, unit, image, suppliers, maxStock // Ensure suppliers is included
    });

    const initialStatus = getStockStatus(newProduct.quantity, newProduct.maxStock);
    newProduct.stockStatus = initialStatus;

    let savedProduct = await newProduct.save();

    if (savedProduct.quantity > 0) {
      await logMovement({
        product: savedProduct._id, type: 'ADJUSTMENT', quantityChange: savedProduct.quantity, stockBefore: 0,
        notes: 'Initial stock from product creation.', recordedBy: req.user.id
      });
    }

    // Stock status notification logic (remains the same)
    if (initialStatus === 'Low' || initialStatus === 'Critical' || initialStatus === 'Out of Stock') {
        const message = initialStatus === 'Out of Stock'
          ? `${savedProduct.name} was created and is OUT OF STOCK.`
          : `${savedProduct.name} was created with ${initialStatus.toLowerCase()} stock (${savedProduct.quantity} remaining).`;
        const newNotifications = await createNotification({
            recipientRole: 'Owner', message: message, type: initialStatus.toUpperCase() + '_STOCK', link: '/inventory' });
        if (newNotifications && newNotifications.length) {
            newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification));
        }
    }

    logAction(req.user, 'CREATE_PRODUCT', `Created product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`, { entityType: 'Product', entityId: savedProduct._id });

    // Populate after saving
    savedProduct = await savedProduct.populate([
        { path: 'category', select: 'name' },
        { path: 'brand', select: 'name' },
        { path: 'suppliers', select: 'name' } // Also populate suppliers here for the response
    ]);


    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
};


// --- updateProduct function (No changes needed, should already save suppliers) ---
const updateProduct = async (req, res) => {
  const io = req.app.get('socketio');
  try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // --- Ensure 'suppliers' is included in the update logic ---
      const allowedUpdates = ['name', 'itemCode', 'category', 'brand', 'cost', 'price', 'maxStock', 'image', 'suppliers'];
      const oldStatus = product.stockStatus;
      let changesMade = false;

      allowedUpdates.forEach(key => {
         // Check if the key exists in req.body AND is different from the current value
         // Need careful comparison for arrays like suppliers
         if (req.body[key] !== undefined) {
             let isDifferent = false;
             if (key === 'suppliers') {
                 // Compare supplier arrays (simple comparison by length and content assuming IDs are strings)
                 const currentSuppliers = product.suppliers.map(s => String(s));
                 const newSuppliers = Array.isArray(req.body.suppliers) ? req.body.suppliers.map(s => String(s)) : [];
                 if (currentSuppliers.length !== newSuppliers.length || !currentSuppliers.every(id => newSuppliers.includes(id))) {
                    isDifferent = true;
                 }
             } else if (String(product[key]) !== String(req.body[key])) { // General comparison
                 isDifferent = true;
             }

             if (isDifferent) {
                product[key] = req.body[key];
                changesMade = true;
             }
         }
      });

      // --- Always recalculate status ---
      const newStatus = getStockStatus(product.quantity, product.maxStock);
      if (newStatus !== oldStatus) {
         product.stockStatus = newStatus;
         changesMade = true; // Status change counts as a change
      }
      // ---

      if (!changesMade) {
          // If nothing changed besides potentially status, just return the populated product
          const populatedProduct = await product.populate([
               { path: 'category', select: 'name' },
               { path: 'brand', select: 'name' },
               { path: 'suppliers', select: 'name' }
          ]);
          return res.json(populatedProduct);
      }

      // --- Save if changes were made ---
      let savedProduct = await product.save();

      // Send notification ONLY if status actually changed
      if (newStatus !== oldStatus) {
        checkStockLevelAndNotify(savedProduct, io);
      }

      logAction(req.user, 'UPDATE_PRODUCT', `Updated product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`, { entityType: 'Product', entityId: savedProduct._id });

      // Populate after saving
      savedProduct = await savedProduct.populate([
          { path: 'category', select: 'name' },
          { path: 'brand', select: 'name' },
          { path: 'suppliers', select: 'name' } // Populate suppliers for the response
      ]);

      res.json(savedProduct);

  } catch (error) {
     console.error("Error updating product:", error); // Add server-side logging
     res.status(400).json({ message: 'Error updating product', error: error.message });
  }
};


// --- deleteProduct function (unchanged) ---
const deleteProduct = async (req, res) => { /* ... */
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            const productId = product._id;
            const productDetails = `Deleted product: '${product.name}' (Code: ${product.itemCode})`;

            // --- Check if product has quantity or movements before deleting? (Optional safety check) ---
            // Example: Check if quantity is 0
            // if (product.quantity > 0) {
            //     return res.status(400).json({ message: 'Cannot delete product with existing stock. Please adjust quantity to 0 first.' });
            // }
            // Example: Check associated movements (more complex)
            // const movementsExist = await Movement.exists({ product: productId });
            // if (movementsExist) {
            //     return res.status(400).json({ message: 'Cannot delete product with transaction history. Consider deactivating instead.' });
            // }
            // --- End Optional Checks ---

            await product.deleteOne();

            logAction(req.user, 'DELETE_PRODUCT', productDetails, { entityType: 'Product', entityId: productId });
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// --- getLowStockProducts function (unchanged) ---
const getLowStockProducts = async (req, res) => { /* ... */
  try {
    const lowStockProducts = await Product.find({
      stockStatus: { $in: ['Low', 'Critical', 'Out of Stock'] }
    });
    res.json(lowStockProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
 };

// --- getProductsBySupplier function (unchanged) ---
const getProductsBySupplier = async (req, res) => { /* ... */
  try {
    const { supplierId } = req.params;
    if (!supplierId) {
        return res.status(400).json({ message: 'Supplier ID is required.' });
    }
    // Only select fields needed for PO creation dropdown
    const products = await Product.find({ suppliers: supplierId })
        .select('itemCode name cost');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching products by supplier.', error: error.message });
  }
};

// --- recalculateAllProductStatuses function (unchanged) ---
const recalculateAllProductStatuses = async (req, res) => { /* ... */
  try {
    const products = await Product.find({});
    let updatedCount = 0;

    for (const product of products) {
      const newStatus = getStockStatus(product.quantity, product.maxStock);
      if (product.stockStatus !== newStatus) {
        product.stockStatus = newStatus;
        await product.save();
        updatedCount++;
      }
    }

    logAction(req.user, 'SYNC_STOCK_STATUS', `Manually re-synced all product stock statuses. ${updatedCount} products updated.`);
    res.status(200).json({ message: `Successfully re-synced all product statuses. ${updatedCount} products were updated.` });

  } catch (error) {
    res.status(500).json({ message: 'Error re-syncing statuses', error: error.message });
  }
};


module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductsBySupplier,
  recalculateAllProductStatuses
};