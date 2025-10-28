// server/controllers/productController.js
const mongoose = require('mongoose'); // <-- Import mongoose
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify, getStockStatus } = require('../utils/stockManager');
const { createNotification } = require('../utils/notificationManager');

// getProducts - Populate supplier from supplierCosts
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .select('itemCode name category brand price quantity image maxStock stockStatus supplierCosts defaultCost status') // <-- Added 'status'
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('supplierCosts.supplier', 'name');

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// createProduct - Save supplierCosts and defaultCost from form
const createProduct = async (req, res) => {
  const io = req.app.get('socketio');
  try {
    // --- Include defaultCost in destructuring ---
    const { name, itemCode, category, brand, price, quantity, unit, image, supplierCosts, maxStock, defaultCost } = req.body;

    const newProduct = new Product({
      name, itemCode, category, brand, price, quantity, unit, image, supplierCosts, maxStock,
      defaultCost: defaultCost || 0, // Use provided defaultCost or fallback to 0
      status: 'active' // --- Explicitly set new products to 'active' ---
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

    if (initialStatus === 'Low' || initialStatus === 'Critical' || initialStatus === 'Out of Stock') {
        const message = initialStatus === 'Out of Stock' ? `${savedProduct.name} was created and is OUT OF STOCK.`
          : `${savedProduct.name} was created with ${initialStatus.toLowerCase()} stock (${savedProduct.quantity} remaining).`;
        const newNotifications = await createNotification({ recipientRole: 'Owner', message: message, type: initialStatus.toUpperCase() + '_STOCK', link: '/inventory' });
        if (newNotifications && newNotifications.length) { newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification)); }
    }

    logAction(req.user, 'CREATE_PRODUCT', `Created product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`, { entityType: 'Product', entityId: savedProduct._id });

    savedProduct = await savedProduct.populate([
        { path: 'category', select: 'name' },
        { path: 'brand', select: 'name' },
        { path: 'supplierCosts.supplier', select: 'name' }
    ]);
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
};


// updateProduct - Save supplierCosts, defaultCost and log changes
const updateProduct = async (req, res) => {
  const io = req.app.get('socketio');
  try {
      const product = await Product.findById(req.params.id).populate('supplierCosts.supplier', 'name');
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const originalProductData = {
          name: product.name,
          itemCode: product.itemCode,
          category: String(product.category),
          brand: String(product.brand),
          price: product.price,
          maxStock: product.maxStock,
          image: product.image,
          defaultCost: product.defaultCost,
          status: product.status, // --- Store original status ---
          supplierCosts: product.supplierCosts.map(sc => ({
              supplier: String(sc.supplier?._id || sc.supplier),
              cost: sc.cost,
              supplierName: sc.supplier?.name
          }))
       };

      // --- Add 'status' to allowed updates ---
      const allowedUpdates = ['name', 'itemCode', 'category', 'brand', 'price', 'maxStock', 'image', 'supplierCosts', 'defaultCost', 'status'];
      const oldStatus = product.stockStatus;
      let changesMade = false;
      let changeDetails = [];

      allowedUpdates.forEach(key => {
         if (req.body[key] !== undefined) {
             let isDifferent = false;
             let newValue = req.body[key];

             if (key === 'supplierCosts') {
                 const currentCosts = originalProductData.supplierCosts;
                 const newCostsInput = Array.isArray(newValue) ? newValue : [];
                 const newCosts = newCostsInput.map(sc => ({ supplier: String(sc.supplier), cost: Number(sc.cost) }));

                 if (currentCosts.length !== newCosts.length ||
                     !currentCosts.every(cc => newCosts.some(nc => nc.supplier === cc.supplier && nc.cost === cc.cost)) ||
                     !newCosts.every(nc => currentCosts.some(cc => cc.supplier === nc.supplier && nc.cost === cc.cost))
                    ) {
                      isDifferent = true;
                      const added = newCosts.filter(nc => !currentCosts.some(cc => cc.supplier === nc.supplier));
                      const removed = currentCosts.filter(cc => !newCosts.some(nc => nc.supplier === cc.supplier));
                      const changed = newCosts.filter(nc => currentCosts.some(cc => cc.supplier === nc.supplier && nc.cost !== cc.cost));

                      if (added.length > 0) changeDetails.push(`added suppliers [IDs: ${added.map(a => a.supplier).join(', ')}]`);
                      if (removed.length > 0) changeDetails.push(`removed suppliers [Names: ${removed.map(r => r.supplierName || r.supplier).join(', ')}]`);
                      changed.forEach(ch => {
                          const old = currentCosts.find(cc => cc.supplier === ch.supplier);
                          changeDetails.push(`changed cost for supplier [ID: ${ch.supplier}] from ${old?.cost} to ${ch.cost}`);
                      });
                 }
             } else if (key === 'category' || key === 'brand') {
                 if (String(originalProductData[key]) !== String(newValue)) {
                    isDifferent = true;
                    changeDetails.push({ key, from: originalProductData[key], to: newValue });
                 }
             } else if (key === 'itemCode' && product) {
                 // Prevent itemCode change after creation
                 if (String(originalProductData[key]) !== String(newValue)) {
                    console.warn(`Attempted to change itemCode from ${originalProductData[key]} to ${newValue} - ignoring.`);
                 }
             } else if (key === 'defaultCost') {
                 if (Number(originalProductData[key]) !== Number(newValue)) {
                     isDifferent = true;
                     changeDetails.push(`changed defaultCost from '${originalProductData[key]}' to '${Number(newValue) || 0}'`);
                 }
             } else if (key === 'status') {
                 if (String(originalProductData[key]) !== String(newValue)) {
                    isDifferent = true;
                    changeDetails.push(`changed status from '${originalProductData[key]}' to '${newValue}'`);
                 }
             } else if (String(originalProductData[key]) !== String(newValue)) {
                 isDifferent = true;
                 changeDetails.push(`changed ${key} from '${originalProductData[key]}' to '${newValue}'`);
             }

             if (isDifferent) {
                if (key === 'supplierCosts') {
                    product[key] = Array.isArray(newValue) ? newValue.map(sc => ({
                        supplier: sc.supplier,
                        cost: Number(sc.cost)
                    })) : [];
                } else if (key === 'defaultCost') {
                    product[key] = Number(newValue) || 0;
                } else if (key !== 'itemCode') { // Ensure itemCode is not overwritten here either
                    product[key] = newValue;
                }
                changesMade = true;
             }
         }
      });

      // Recalculate stockStatus based on current quantity and potentially updated maxStock
      const newStockStatus = getStockStatus(product.quantity, product.maxStock);
      if (newStockStatus !== oldStatus) {
         product.stockStatus = newStockStatus;
         changesMade = true;
         changeDetails.push(`stock status changed from '${oldStatus}' to '${newStockStatus}'`);
      }

      if (!changesMade) {
          const populatedProduct = await Product.findById(product._id)
              .populate('category', 'name').populate('brand', 'name').populate('supplierCosts.supplier', 'name');
          console.log("No effective changes detected, returning current product data.");
          return res.json(populatedProduct);
      }

      let savedProduct = await product.save();

      // Send notification if stock status changed to a low state
      if (newStockStatus !== oldStatus && (newStockStatus === 'Low' || newStockStatus === 'Critical' || newStockStatus === 'Out of Stock')) {
        checkStockLevelAndNotify(savedProduct, io);
      }

      // Populate related fields for logging descriptions
      let logMessage = `Updated product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`;
      if (changeDetails.length > 0) {
           const populatedChanges = await Promise.all(changeDetails.map(async (change) => {
              if (typeof change === 'object' && change.key === 'category') {
                  const [oldCat, newCat] = await Promise.all([ mongoose.model('Category').findById(change.from).select('name'), mongoose.model('Category').findById(change.to).select('name') ]);
                  return `changed category from '${oldCat?.name || change.from}' to '${newCat?.name || change.to}'`;
              }
              if (typeof change === 'object' && change.key === 'brand') {
                   const [oldBrand, newBrand] = await Promise.all([ mongoose.model('Brand').findById(change.from).select('name'), mongoose.model('Brand').findById(change.to).select('name') ]);
                  return `changed brand from '${oldBrand?.name || change.from}' to '${newBrand?.name || change.to}'`;
              }
              // Handle complex supplier cost changes description if needed, otherwise keep simple string
              return change;
          }));
          logMessage += ` - ${populatedChanges.join(', ')}.`;
      } else {
          logMessage += ".";
      }

      logAction(req.user, 'UPDATE_PRODUCT', logMessage, { entityType: 'Product', entityId: savedProduct._id });

      // Re-populate for the response
      savedProduct = await Product.findById(savedProduct._id)
         .populate('category', 'name')
         .populate('brand', 'name')
         .populate('supplierCosts.supplier', 'name');

      res.json(savedProduct);

  } catch (error) {
     console.error("Error updating product:", error);
     res.status(400).json({ message: 'Error updating product', error: error.message });
  }
};


// Archives a product by setting its status to inactive
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            product.status = 'inactive'; // Set status to inactive
            await product.save();

            logAction(
              req.user,
              'ARCHIVE_PRODUCT',
              `Archived product: '${product.name}' (Code: ${product.itemCode})`,
              { entityType: 'Product', entityId: product._id }
            );

            // Return the updated (archived) product
            const populatedProduct = await Product.findById(product._id)
              .populate('category', 'name')
              .populate('brand', 'name')
              .populate('supplierCosts.supplier', 'name');

            res.json({ message: 'Product archived successfully', product: populatedProduct });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error("Error archiving product:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Gets active products with low stock status
const getLowStockProducts = async (req, res) => {
    try {
        const lowStockProducts = await Product.find({
            stockStatus: { $in: ['Low', 'Critical', 'Out of Stock'] },
            status: 'active' // Only active products
        })
            .select('name quantity maxStock stockStatus reorderLevel') // Include reorderLevel if needed for notifications
            .sort({ quantity: 'asc' });
        res.json(lowStockProducts);
    } catch (error) {
        console.error("Error fetching low stock products:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Gets active products associated with a specific supplier
const getProductsBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    // --- ADD LOG ---
    console.log(`Backend: Fetching products for supplier ID: ${supplierId}`);
    // --- END LOG ---
    if (!supplierId) { return res.status(400).json({ message: 'Supplier ID is required.' }); }

    const products = await Product.find({
        'supplierCosts.supplier': supplierId,
        status: 'active' // Only find active products
    })
        // --- MODIFIED: Select fields needed for Autocomplete AND cost ---
        // Also select defaultCost as a fallback
        .select('itemCode name supplierCosts defaultCost');
        // If 'unit' is needed for display later, add it: .select('itemCode name supplierCosts defaultCost unit');

    // --- ADD LOG ---
    console.log(`Backend: Found ${products.length} raw active products from DB for supplier ${supplierId}:`, products);
    // --- END LOG ---

    // --- ADJUST MAPPING TO USE THE CORRECT COST FIELD ---
     const productsWithCost = products.map(p => {
         // Find the cost entry specifically for THIS supplier
         const relevantCostEntry = p.supplierCosts?.find(sc => String(sc.supplier) === String(supplierId));
         return {
             _id: p._id,
             itemCode: p.itemCode,
             name: p.name,
             // Use the cost from the specific supplier entry, or the product's defaultCost, or fallback to 0
             cost: relevantCostEntry ? relevantCostEntry.cost : (p.defaultCost || 0)
             // unit: p.unit // Include unit if selected above and needed
         };
     });
    // --- END ADJUSTMENT ---

    // --- ADD LOG ---
    console.log(`Backend: Mapped products being sent for supplier ${supplierId}:`, productsWithCost);
    // --- END LOG ---

    res.json(productsWithCost);
  } catch (error) {
    // --- ADD LOG ---
    console.error("Backend Error getting products by supplier:", error);
    // --- END LOG ---
    res.status(500).json({ message: 'Server error while fetching products by supplier.', error: error.message });
  }
};


// Recalculates stock status for all products
const recalculateAllProductStatuses = async (req, res) => {
    try {
        const products = await Product.find({}); let updatedCount = 0;
        for (const product of products) {
            const newStatus = getStockStatus(product.quantity, product.maxStock);
            if (product.stockStatus !== newStatus) {
                product.stockStatus = newStatus; await product.save(); updatedCount++;
            }
        }
        logAction(req.user, 'SYNC_STOCK_STATUS', `Manually re-synced all product stock statuses. ${updatedCount} products updated.`);
        res.status(200).json({ message: `Successfully re-synced all product statuses. ${updatedCount} products were updated.` });
    } catch (error) {
        console.error("Error recalculating stock statuses:", error);
        res.status(500).json({ message: 'Error re-syncing statuses', error: error.message });
    }
};


module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct, // Note: This actually archives the product
  getLowStockProducts,
  getProductsBySupplier,
  recalculateAllProductStatuses
};