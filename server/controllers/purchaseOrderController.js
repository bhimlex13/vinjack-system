// server/controllers/purchaseOrderController.js
const PurchaseOrder = require('../models/purchaseOrderModel');
const Counter = require('../models/counterModel');
const Product = require('../models/productModel');
const Delivery = require('../models/deliveryModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');

async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName, { $inc: { seq: 1 } }, { new: true, upsert: true }
  );
  return sequenceDocument.seq;
}

const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, items, notes } = req.body;
    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier and items are required.' });
    }
    let totalAmount = 0;
    // --- FIX IS IN THIS SECTION ---
    const processedItems = items.map(item => {
      // FIX 1: Changed 'item.cost' to 'item.unitCost' to match frontend data
      const itemTotal = item.quantity * item.unitCost;
      totalAmount += itemTotal;
      // FIX 2: Changed 'item.productId' to 'item.product' and 'item.cost' to 'item.unitCost'
      return { product: item.product, quantity: item.quantity, cost: item.unitCost, total: itemTotal };
    });
    const sequence = await getNextSequenceValue('purchaseOrder');
    const poNumber = `PO-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;
    const purchaseOrder = new PurchaseOrder({ poNumber, supplier, items: processedItems, totalAmount, notes });
    const createdPurchaseOrder = await purchaseOrder.save();
    logAction(req.user, 'CREATE_PO', `Created Purchase Order #${poNumber}`);
    res.status(201).json(createdPurchaseOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error while creating purchase order.', error: error.message });
  }
};

const getAllPurchaseOrders = async (req, res) => {
  try {
    const purchaseOrders = await PurchaseOrder.find({}).populate('supplier', 'name').sort({ createdAt: -1 });
    res.json(purchaseOrders);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching purchase orders.', error: error.message });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name contactPerson contactNumber address')
      .populate('items.product', 'name itemCode unit');
    if (purchaseOrder) res.json(purchaseOrder);
    else res.status(404).json({ message: 'Purchase Order not found' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching purchase order.', error: error.message });
  }
};

const receivePurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).populate('supplier', 'name');
    if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });
    if (po.status !== 'Pending' && po.status !== 'Approved') {
      return res.status(400).json({ message: `Cannot receive order with status '${po.status}'.` });
    }
    const productsReceived = po.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      costAtTime: item.cost,
    }));
    const movementsToLog = [];
    for (const item of productsReceived) {
      const product = await Product.findById(item.product);
      const stockBefore = product.quantity;
      product.quantity += item.quantity;
      product.cost = item.costAtTime;
      await product.save();
      movementsToLog.push({
        product: product._id, type: 'DELIVERY', quantityChange: item.quantity,
        stockBefore, recordedBy: req.user.id
      });
    }
    const delivery = new Delivery({
      supplier: po.supplier._id,
      purchaseOrder: po._id,
      productsReceived,
      recordedBy: req.user.id,
    });
    const createdDelivery = await delivery.save();
    for (const movement of movementsToLog) {
      movement.referenceId = createdDelivery._id;
      await logMovement(movement);
    }
    po.status = 'Completed';
    const updatedPurchaseOrder = await po.save();
    logAction(req.user, 'RECEIVE_PO', `Received items for PO #${po.poNumber} via Delivery #${createdDelivery._id}.`);
    res.json({ message: 'Stock received and delivery record created successfully.', purchaseOrder: updatedPurchaseOrder });
  } catch (error) {
    res.status(500).json({ message: 'Server error while receiving stock.', error: error.message });
  }
};

const cancelPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });
    if (po.status !== 'Pending' && po.status !== 'Approved') {
      return res.status(400).json({ message: `Cannot cancel order with status '${po.status}'.` });
    }
    po.status = 'Cancelled';
    const updatedPurchaseOrder = await po.save();
    logAction(req.user, 'CANCEL_PO', `Cancelled Purchase Order #${po.poNumber}`);
    res.json({ message: 'Purchase Order has been cancelled.', purchaseOrder: updatedPurchaseOrder });
  } catch (error) {
    res.status(500).json({ message: 'Server error while cancelling PO.', error: error.message });
  }
};

module.exports = {
    createPurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderById,
    receivePurchaseOrder,
    cancelPurchaseOrder
};