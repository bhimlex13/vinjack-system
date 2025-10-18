// server/controllers/productController.js
const Product = require('../models/productModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
// --- MODIFIED: Make sure getStockStatus is imported ---
const { checkStockLevelAndNotify, getStockStatus } = require('../utils/stockManager');
const { createNotification } = require('../utils/notificationManager');

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .select('itemCode name category brand cost price quantity reorderLevel image maxStock stockStatus')
      .populate('category', 'name')
      .populate('brand', 'name');    
      
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const createProduct = async (req, res) => {
  const io = req.app.get('socketio');
  try {
    const { name, itemCode, category, brand, cost, price, quantity, unit, reorderLevel, image, suppliers, maxStock } = req.body;
    
    const newProduct = new Product({ 
      name, itemCode, category, brand, cost, price, quantity, unit, reorderLevel, image, suppliers, maxStock 
    });
    
    const initialStatus = getStockStatus(newProduct.quantity, newProduct.maxStock);
    newProduct.stockStatus = initialStatus;

    let savedProduct = await newProduct.save();
    
    if (savedProduct.quantity > 0) {
      await logMovement({
        product: savedProduct._id,
        type: 'ADJUSTMENT',
        quantityChange: savedProduct.quantity,
        stockBefore: 0,
        notes: 'Initial stock from product creation.',
        recordedBy: req.user.id
      });
    }

    if (initialStatus === 'Low' || initialStatus === 'Critical' || initialStatus === 'Out of Stock') {
        const message = initialStatus === 'Out of Stock'
          ? `${savedProduct.name} was created and is OUT OF STOCK.`
          : `${savedProduct.name} was created with ${initialStatus.toLowerCase()} stock (${savedProduct.quantity} remaining).`;
          
        const newNotifications = await createNotification({
            recipientRole: 'Owner',
            message: message,
            type: initialStatus.toUpperCase() + '_STOCK',
            link: '/inventory'
        });

        if (newNotifications && newNotifications.length) {
            newNotifications.forEach(notification => io.to(notification.user.toString()).emit('new_notification', notification));
        }
    }

    logAction(req.user, 'CREATE_PRODUCT', `Created product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`, { entityType: 'Product', entityId: savedProduct._id });
    
    savedProduct = await savedProduct.populate('category', 'name');
    savedProduct = await savedProduct.populate('brand', 'name');
    
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  const io = req.app.get('socketio');
  try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const stockBeforeUpdate = product.quantity;
      const maxStockBeforeUpdate = product.maxStock; 

      const newStockQuantity = req.body.quantity;
      const newMaxStock = req.body.maxStock; 

      const didQuantityChange = newStockQuantity !== undefined && stockBeforeUpdate !== Number(newStockQuantity);
      // --- FIX: Check against undefined OR null ---
      const didMaxStockChange = newMaxStock !== undefined && (maxStockBeforeUpdate ?? 1) !== Number(newMaxStock); 

      product.name = req.body.name || product.name;
      product.itemCode = req.body.itemCode || product.itemCode;
      product.category = req.body.category || product.category;
      product.brand = req.body.brand || product.brand;
      product.cost = req.body.cost ?? product.cost;
      product.price = req.body.price ?? product.price;
      product.quantity = newStockQuantity ?? product.quantity;
      product.reorderLevel = req.body.reorderLevel ?? product.reorderLevel;
      product.maxStock = newMaxStock ?? product.maxStock; 
      product.image = req.body.image || product.image;
      product.suppliers = req.body.suppliers || product.suppliers;
      
      // --- MODIFIED LOGIC ---
      // We will *always* recalculate status on an update now, to be safe.
      const newStatus = getStockStatus(product.quantity, product.maxStock);
      const oldStatus = product.stockStatus;
      product.stockStatus = newStatus;
      // --- END MODIFICATION ---

      let savedProduct = await product.save(); // First save (for form data)

      // Only log movement if quantity changed
      if (didQuantityChange) {
        await logMovement({
          product: savedProduct._id,
          type: 'ADJUSTMENT',
          quantityChange: newStockQuantity - stockBeforeUpdate,
          stockBefore: stockBeforeUpdate,
          notes: 'Manual stock update from product form.',
          recordedBy: req.user.id
        });
      }

      // Only send notification if status *actually* changed
      if (newStatus !== oldStatus) {
        // We pass the *saved* product to the notification function
        // but we don't need to await it or re-assign
        checkStockLevelAndNotify(savedProduct, io);
      }
      // --- END MODIFICATION ---

      logAction(req.user, 'UPDATE_PRODUCT', `Updated product: '${savedProduct.name}' (Code: ${savedProduct.itemCode})`, { entityType: 'Product', entityId: savedProduct._id });
      
      savedProduct = await savedProduct.populate('category', 'name');
      savedProduct = await savedProduct.populate('brand', 'name');
    	
      res.json(savedProduct);

  } catch (error) {
    res.status(400).json({ message: 'Error updating product', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
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
  try {
    const lowStockProducts = await Product.find({
      stockStatus: { $in: ['Low', 'Critical', 'Out of Stock'] }
    });
    res.json(lowStockProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


const getProductsBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    if (!supplierId) {
        return res.status(400).json({ message: 'Supplier ID is required.' });
    }
    const products = await Product.find({ suppliers: supplierId })
        .select('itemCode name cost'); 
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching products by supplier.', error: error.message });
  }
};

// --- START NEW FUNCTION ---
const recalculateAllProductStatuses = async (req, res) => {
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
// --- END NEW FUNCTION ---


module.exports = { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getLowStockProducts,
  getProductsBySupplier,
  recalculateAllProductStatuses // --- ADDED ---
};