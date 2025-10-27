// server/controllers/productController.js
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify, getStockStatus } = require('../utils/stockManager');
const { createNotification } = require('../utils/notificationManager');

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .select('itemCode name category brand cost price quantity image maxStock stockStatus suppliers')
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('suppliers', 'name');

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const createProduct = async (req, res) => {
  // ... (createProduct logic remains the same - already logs creation) ...
   const io = req.app.get('socketio');
  try {
    const { name, itemCode, category, brand, cost, price, quantity, unit, image, suppliers, maxStock } = req.body;
    const newProduct = new Product({ name, itemCode, category, brand, cost, price, quantity, unit, image, suppliers, maxStock });
    const initialStatus = getStockStatus(newProduct.quantity, newProduct.maxStock);
    newProduct.stockStatus = initialStatus;
    let savedProduct = await newProduct.save();

    if (savedProduct.quantity > 0) {
      await logMovement({
        product: savedProduct._id, type: 'ADJUSTMENT', quantityChange: savedProduct.quantity, stockBefore: 0,
        notes: 'Initial stock from product creation.', recordedBy: req.user.id
      });
    }
    if (initialStatus === 'Low' || initialStatus === 'Critical' || initialStatus === 'Out of Stock') {
        const message = initialStatus === 'Out of Stock' ? `${savedProduct.name} was created and is OUT OF STOCK.`
          : `${savedProduct.name} was created with ${initialStatus.toLowerCase()} stock (${savedProduct.quantity} remaining).`;
        const newNotifications = await createNotification({ recipientRole: 'Owner', message: message, type: initialStatus.toUpperCase() + '_STOCK', link: '/inventory' });
        if (newNotifications && newNotifications.length) {
            newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification));
        }
    }
    logAction(req.user, 'CREATE_PRODUCT', `Created product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`, { entityType: 'Product', entityId: savedProduct._id });
    savedProduct = await savedProduct.populate([ { path: 'category', select: 'name' }, { path: 'brand', select: 'name' }, { path: 'suppliers', select: 'name' } ]);
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
};


// --- MODIFICATION START ---
const updateProduct = async (req, res) => {
  const io = req.app.get('socketio');
  try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // --- Store original values for comparison ---
      const originalProductData = {
          name: product.name,
          itemCode: product.itemCode, // Although disabled in form, include for completeness
          category: String(product.category), // Store as string ID
          brand: String(product.brand), // Store as string ID
          cost: product.cost,
          price: product.price,
          maxStock: product.maxStock,
          image: product.image,
          suppliers: product.suppliers.map(s => String(s)) // Store as array of string IDs
      };
      // ---

      const allowedUpdates = ['name', 'itemCode', 'category', 'brand', 'cost', 'price', 'maxStock', 'image', 'suppliers'];
      const oldStatus = product.stockStatus;
      let changesMade = false;
      let changeDetails = []; // --- Array to store specific changes ---

      allowedUpdates.forEach(key => {
         if (req.body[key] !== undefined) {
             let isDifferent = false;
             let newValue = req.body[key]; // Capture the new value

             if (key === 'suppliers') {
                 const currentSuppliers = originalProductData.suppliers; // Use original data
                 const newSuppliers = Array.isArray(newValue) ? newValue.map(s => String(s)) : [];
                 if (currentSuppliers.length !== newSuppliers.length || !currentSuppliers.every(id => newSuppliers.includes(id)) || !newSuppliers.every(id => currentSuppliers.includes(id))) {
                    isDifferent = true;
                    // For suppliers, log a generic change message as listing all IDs can be long
                    changeDetails.push(`updated assigned suppliers`);
                 }
             } else if (key === 'category' || key === 'brand') {
                 // Compare string IDs for category/brand
                 if (String(originalProductData[key]) !== String(newValue)) {
                    isDifferent = true;
                    // We need to fetch names later for the log message
                    changeDetails.push({ key, from: originalProductData[key], to: newValue });
                 }
             } else if (String(originalProductData[key]) !== String(newValue)) { // General comparison
                 isDifferent = true;
                 changeDetails.push(`changed ${key} from '${originalProductData[key]}' to '${newValue}'`);
             }

             if (isDifferent) {
                product[key] = newValue;
                changesMade = true;
             }
         }
      });

      // --- Always recalculate status ---
      const newStatus = getStockStatus(product.quantity, product.maxStock);
      if (newStatus !== oldStatus) {
         product.stockStatus = newStatus;
         changesMade = true; // Status change counts as a change
         changeDetails.push(`stock status changed from '${oldStatus}' to '${newStatus}'`);
      }
      // ---

      if (!changesMade) {
          // If nothing changed, just return the populated product
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
      if (newStatus !== oldStatus && (newStatus === 'Low' || newStatus === 'Critical' || newStatus === 'Out of Stock')) {
        checkStockLevelAndNotify(savedProduct, io);
      }

      // --- Build detailed log message ---
      let logMessage = `Updated product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`;
      if (changeDetails.length > 0) {
          // Fetch names for category/brand if they were changed
          const populatedChanges = await Promise.all(changeDetails.map(async (change) => {
              if (typeof change === 'object' && change.key === 'category') {
                  const [oldCat, newCat] = await Promise.all([
                      mongoose.model('Category').findById(change.from).select('name'),
                      mongoose.model('Category').findById(change.to).select('name')
                  ]);
                  return `changed category from '${oldCat?.name || change.from}' to '${newCat?.name || change.to}'`;
              }
              if (typeof change === 'object' && change.key === 'brand') {
                  const [oldBrand, newBrand] = await Promise.all([
                      mongoose.model('Brand').findById(change.from).select('name'),
                      mongoose.model('Brand').findById(change.to).select('name')
                  ]);
                  return `changed brand from '${oldBrand?.name || change.from}' to '${newBrand?.name || change.to}'`;
              }
              return change; // Return strings or supplier message directly
          }));
          logMessage += ` - ${populatedChanges.join(', ')}.`;
      } else {
          logMessage += "."; // Add period if no specific details (shouldn't happen if changesMade is true)
      }
      // ---

      logAction(req.user, 'UPDATE_PRODUCT', logMessage, { entityType: 'Product', entityId: savedProduct._id });

      // Populate after saving for the response
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
// --- MODIFICATION END ---


const deleteProduct = async (req, res) => {
    // ... (deleteProduct logic remains the same) ...
     try {
        const product = await Product.findById(req.params.id);
        if (product) {
            const productId = product._id;
            const productDetails = `Deleted product: '${product.name}' (Code: ${product.itemCode})`;
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

const getLowStockProducts = async (req, res) => {
    // ... (getLowStockProducts logic remains the same) ...
    try {
    const lowStockProducts = await Product.find({ stockStatus: { $in: ['Low', 'Critical', 'Out of Stock'] } });
    res.json(lowStockProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
 };

const getProductsBySupplier = async (req, res) => {
    // ... (getProductsBySupplier logic remains the same) ...
     try {
    const { supplierId } = req.params;
    if (!supplierId) {
        return res.status(400).json({ message: 'Supplier ID is required.' });
    }
    const products = await Product.find({ suppliers: supplierId }).select('itemCode name cost');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching products by supplier.', error: error.message });
  }
};

const recalculateAllProductStatuses = async (req, res) => {
    // ... (recalculateAllProductStatuses logic remains the same) ...
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