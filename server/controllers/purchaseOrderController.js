// server/controllers/purchaseOrderController.js
const PurchaseOrder = require('../models/purchaseOrderModel');
const Counter = require('../models/counterModel');
const Product = require('../models/productModel');

// Function to get the next sequence number for PO
async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.seq;
}

// @desc    Create a new purchase order
// @route   POST /api/purchase-orders
// @access  Private
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, items, notes } = req.body;

    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier and items are required.' });
    }

    let totalAmount = 0;
    const processedItems = items.map(item => {
      const itemTotal = item.quantity * item.cost;
      totalAmount += itemTotal;
      return {
        product: item.productId,
        quantity: item.quantity,
        cost: item.cost,
        total: itemTotal
      };
    });

    const sequence = await getNextSequenceValue('purchaseOrder');
    const year = new Date().getFullYear();
    const poNumber = `PO-${year}-${String(sequence).padStart(4, '0')}`;

    const purchaseOrder = new PurchaseOrder({
      poNumber,
      supplier,
      items: processedItems,
      totalAmount,
      notes,
      status: 'Pending'
    });

    const createdPurchaseOrder = await purchaseOrder.save();

    res.status(201).json(createdPurchaseOrder);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ message: 'Server error while creating purchase order.' });
  }
};

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
// @access  Private
exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const purchaseOrders = await PurchaseOrder.find({})
      .populate('supplier', 'name')
      .sort({ createdAt: -1 });
    res.json(purchaseOrders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ message: 'Server error while fetching purchase orders.' });
  }
};

// @desc    Get purchase order by ID
// @route   GET /api/purchase-orders/:id
// @access  Private
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name contactPerson contactNumber address')
      .populate('items.product', 'name itemCode unit');

    if (purchaseOrder) {
      res.json(purchaseOrder);
    } else {
      res.status(404).json({ message: 'Purchase Order not found' });
    }
  } catch (error) {
    console.error('Error fetching purchase order by ID:', error);
    res.status(500).json({ message: 'Server error while fetching purchase order.' });
  }
};

// @desc    Receive stock from a purchase order and update inventory
// @route   POST /api/purchase-orders/:id/receive
// @access  Private
exports.receivePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found.' });
    }

    if (purchaseOrder.status === 'Completed') {
      return res.status(400).json({ message: 'This purchase order has already been completed.' });
    }

    // Use a loop to update each product's quantity
    for (const item of purchaseOrder.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: item.quantity }
      });
    }

    // Update the purchase order's status
    purchaseOrder.status = 'Completed';
    const updatedPurchaseOrder = await purchaseOrder.save();

    res.json({ message: 'Stock received and inventory updated successfully.', purchaseOrder: updatedPurchaseOrder });

  } catch (error) {
    console.error('Error receiving purchase order stock:', error);
    res.status(500).json({ message: 'Server error while receiving stock.' });
  }
};