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
      .select('itemCode name category brand price quantity image maxStock stockStatus supplierCosts defaultCost') // Adjusted fields
      .populate('category', 'name')
      .populate('brand', 'name')
      // --- Populate supplier *within* supplierCosts ---
      .populate('supplierCosts.supplier', 'name'); // <-- Populate nested field

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
      defaultCost: defaultCost || 0 // Use provided defaultCost or fallback to 0
    });

    const initialStatus = getStockStatus(newProduct.quantity, newProduct.maxStock);
    newProduct.stockStatus = initialStatus;

    // --- REMOVED pre-save hook logic, defaultCost is set directly ---
    let savedProduct = await newProduct.save();

    if (savedProduct.quantity > 0) {
      await logMovement({ // Simplified movement log data
        product: savedProduct._id, type: 'ADJUSTMENT', quantityChange: savedProduct.quantity, stockBefore: 0,
        notes: 'Initial stock from product creation.', recordedBy: req.user.id
      });
    }
    // Notification logic
    if (initialStatus === 'Low' || initialStatus === 'Critical' || initialStatus === 'Out of Stock') {
        const message = initialStatus === 'Out of Stock' ? `${savedProduct.name} was created and is OUT OF STOCK.`
          : `${savedProduct.name} was created with ${initialStatus.toLowerCase()} stock (${savedProduct.quantity} remaining).`;
        const newNotifications = await createNotification({ recipientRole: 'Owner', message: message, type: initialStatus.toUpperCase() + '_STOCK', link: '/inventory' });
        if (newNotifications && newNotifications.length) { newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification)); }
    }
    // Log action
    logAction(req.user, 'CREATE_PRODUCT', `Created product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`, { entityType: 'Product', entityId: savedProduct._id });

    // --- Populate for response ---
    savedProduct = await savedProduct.populate([
        { path: 'category', select: 'name' },
        { path: 'brand', select: 'name' },
        { path: 'supplierCosts.supplier', select: 'name' } // Populate nested supplier
    ]);
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Create Product Error:", error); // More detailed logging
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
};


// updateProduct - Save supplierCosts, defaultCost and log changes
const updateProduct = async (req, res) => {
  const io = req.app.get('socketio');
  try {
      // Populate supplier names within supplierCosts for easier logging of removed suppliers
      const product = await Product.findById(req.params.id).populate('supplierCosts.supplier', 'name');
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Store original values for comparison and logging
      const originalProductData = {
          name: product.name,
          itemCode: product.itemCode,
          category: String(product.category), // Store ID
          brand: String(product.brand), // Store ID
          price: product.price,
          maxStock: product.maxStock,
          image: product.image,
          defaultCost: product.defaultCost, // Store original default cost
          // Store supplierCosts with string IDs and names for logging/comparison
          supplierCosts: product.supplierCosts.map(sc => ({
              supplier: String(sc.supplier?._id || sc.supplier),
              cost: sc.cost,
              supplierName: sc.supplier?.name // Keep name for logging removals
          }))
       };

      // Define which fields can be updated from the request body
      const allowedUpdates = ['name', 'itemCode', 'category', 'brand', 'price', 'maxStock', 'image', 'supplierCosts', 'defaultCost'];
      const oldStatus = product.stockStatus;
      let changesMade = false;
      let changeDetails = []; // Array to store descriptions of changes for logging

      // Iterate through allowed fields and compare with request body
      allowedUpdates.forEach(key => {
         if (req.body[key] !== undefined) { // Check if the field is present in the request
             let isDifferent = false;
             let newValue = req.body[key]; // The value sent from the frontend

             // --- Specific comparison logic for different field types ---
             if (key === 'supplierCosts') {
                 // Compare arrays of supplier costs (more complex)
                 const currentCosts = originalProductData.supplierCosts;
                 const newCostsInput = Array.isArray(newValue) ? newValue : [];
                 const newCosts = newCostsInput.map(sc => ({ supplier: String(sc.supplier), cost: Number(sc.cost) }));

                 // Check for differences in length or content
                 if (currentCosts.length !== newCosts.length ||
                     !currentCosts.every(cc => newCosts.some(nc => nc.supplier === cc.supplier && nc.cost === cc.cost)) ||
                     !newCosts.every(nc => currentCosts.some(cc => cc.supplier === nc.supplier && nc.cost === cc.cost))
                    ) {
                      isDifferent = true;
                      // Log details about added/removed/changed suppliers/costs
                      const added = newCosts.filter(nc => !currentCosts.some(cc => cc.supplier === nc.supplier));
                      const removed = currentCosts.filter(cc => !newCosts.some(nc => nc.supplier === cc.supplier));
                      const changed = newCosts.filter(nc => currentCosts.some(cc => cc.supplier === nc.supplier && nc.cost !== cc.cost));

                      if (added.length > 0) changeDetails.push(`added suppliers [IDs: ${added.map(a => a.supplier).join(', ')}]`); // Log IDs, names can be fetched later if needed
                      if (removed.length > 0) changeDetails.push(`removed suppliers [Names: ${removed.map(r => r.supplierName || r.supplier).join(', ')}]`); // Use stored names for removals
                      changed.forEach(ch => {
                          const old = currentCosts.find(cc => cc.supplier === ch.supplier);
                          // Log IDs, fetch names later if needed
                          changeDetails.push(`changed cost for supplier [ID: ${ch.supplier}] from ${old?.cost} to ${ch.cost}`);
                      });
                 }
             } else if (key === 'category' || key === 'brand') {
                 // Compare ObjectId strings
                 if (String(originalProductData[key]) !== String(newValue)) {
                    isDifferent = true;
                    changeDetails.push({ key, from: originalProductData[key], to: newValue }); // Store IDs for name lookup later
                 }
             } else if (key === 'itemCode' && product) {
                 // Prevent itemCode update after creation, but log the attempt
                 if (String(originalProductData[key]) !== String(newValue)) {
                    console.log(`Attempted to change itemCode from ${originalProductData[key]} to ${newValue} - ignoring.`);
                    // Optionally log the attempt, but don't set isDifferent
                 }
             } else if (key === 'defaultCost') {
                 // Compare numbers
                 if (Number(originalProductData[key]) !== Number(newValue)) {
                     isDifferent = true;
                     changeDetails.push(`changed defaultCost from '${originalProductData[key]}' to '${Number(newValue) || 0}'`);
                 }
             } else if (String(originalProductData[key]) !== String(newValue)) {
                 // General string comparison for other fields (name, price, maxStock, image)
                 isDifferent = true;
                 changeDetails.push(`changed ${key} from '${originalProductData[key]}' to '${newValue}'`);
             }

             // --- Apply the update to the Mongoose document if different ---
             if (isDifferent) {
                if (key === 'supplierCosts') {
                    // Ensure correct structure and types
                    product[key] = Array.isArray(newValue) ? newValue.map(sc => ({
                        supplier: sc.supplier, // Keep ObjectId/string from request
                        cost: Number(sc.cost)  // Ensure cost is Number
                    })) : [];
                } else if (key === 'defaultCost') {
                    product[key] = Number(newValue) || 0; // Ensure defaultCost is Number
                } else {
                    product[key] = newValue; // Apply update for other keys
                }
                changesMade = true; // Mark that at least one change occurred
             }
         }
      });

      // --- Always recalculate stock status based on current quantity and potentially updated maxStock ---
      const newStatus = getStockStatus(product.quantity, product.maxStock);
      if (newStatus !== oldStatus) {
         product.stockStatus = newStatus;
         changesMade = true; // Status change counts as a change
         changeDetails.push(`stock status changed from '${oldStatus}' to '${newStatus}'`);
      }
      // ---

      // If no actual changes were made after comparison, return early
      if (!changesMade) {
          const populatedProduct = await Product.findById(product._id)
              .populate('category', 'name').populate('brand', 'name').populate('supplierCosts.supplier', 'name');
          console.log("No effective changes detected, returning current product data.");
          return res.json(populatedProduct);
      }

      // --- Save the product document if changes were made ---
      let savedProduct = await product.save();

      // Send stock level notification ONLY if status changed to a problematic level
      if (newStatus !== oldStatus && (newStatus === 'Low' || newStatus === 'Critical' || newStatus === 'Out of Stock')) {
        checkStockLevelAndNotify(savedProduct, io);
      }

      // --- Build detailed log message ---
      let logMessage = `Updated product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`;
      if (changeDetails.length > 0) {
           // Asynchronously fetch names for category/brand/supplier IDs for a more readable log
           const populatedChanges = await Promise.all(changeDetails.map(async (change) => {
              if (typeof change === 'object' && change.key === 'category') {
                  const [oldCat, newCat] = await Promise.all([ mongoose.model('Category').findById(change.from).select('name'), mongoose.model('Category').findById(change.to).select('name') ]);
                  return `changed category from '${oldCat?.name || change.from}' to '${newCat?.name || change.to}'`;
              }
              if (typeof change === 'object' && change.key === 'brand') {
                   const [oldBrand, newBrand] = await Promise.all([ mongoose.model('Brand').findById(change.from).select('name'), mongoose.model('Brand').findById(change.to).select('name') ]);
                  return `changed brand from '${oldBrand?.name || change.from}' to '${newBrand?.name || change.to}'`;
              }
              // Add more specific formatting for supplier changes if needed
              // e.g., fetch supplier names based on IDs logged in changeDetails
              return change; // Return strings directly
          }));
          logMessage += ` - ${populatedChanges.join(', ')}.`;
      } else {
          logMessage += "."; // Should not happen if changesMade is true
      }
      // --- End building log message ---

      logAction(req.user, 'UPDATE_PRODUCT', logMessage, { entityType: 'Product', entityId: savedProduct._id });

      // --- Populate response fully after saving ---
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


const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            const productId = product._id; const productDetails = `Deleted product: '${product.name}' (Code: ${product.itemCode})`;
            await product.deleteOne(); logAction(req.user, 'DELETE_PRODUCT', productDetails, { entityType: 'Product', entityId: productId });
            res.json({ message: 'Product removed' });
        } else { res.status(404).json({ message: 'Product not found' }); }
    } catch (error) { res.status(500).json({ message: 'Server Error', error: error.message }); }
};

const getLowStockProducts = async (req, res) => {
    try {
        const lowStockProducts = await Product.find({ stockStatus: { $in: ['Low', 'Critical', 'Out of Stock'] } })
            .select('name quantity maxStock stockStatus') // Select relevant fields
            .sort({ quantity: 'asc' });
        res.json(lowStockProducts);
    } catch (error) {
        console.error("Error fetching low stock products:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const getProductsBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    if (!supplierId) { return res.status(400).json({ message: 'Supplier ID is required.' }); }

    const products = await Product.find({ 'supplierCosts.supplier': supplierId })
        .select('itemCode name supplierCosts.$'); // Use projection to get only the matching supplierCosts element

     const productsWithCost = products.map(p => {
         const relevantCostEntry = p.supplierCosts && p.supplierCosts.length > 0 ? p.supplierCosts[0] : null;
         return {
             _id: p._id,
             itemCode: p.itemCode,
             name: p.name,
             cost: relevantCostEntry ? relevantCostEntry.cost : 0 // Use cost from the projected element
         };
     });

    res.json(productsWithCost);
  } catch (error) {
    console.error("Error getting products by supplier:", error);
    res.status(500).json({ message: 'Server error while fetching products by supplier.', error: error.message });
  }
};

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