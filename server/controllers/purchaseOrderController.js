// server/controllers/purchaseOrderController.js
const crypto = require('crypto');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Counter = require('../models/counterModel');
const Product = require('../models/productModel');
// --- 1. IMPORT Supplier model ---
const Supplier = require('../models/supplierModel');
const Delivery = require('../models/deliveryModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify } = require('../utils/stockManager');
// --- 2. IMPORT sendPoLink ---
const { sendPoLink } = require('../utils/emailService');

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
    const token = crypto.randomBytes(32).toString('hex');
    let totalAmount = 0;
    const processedItems = items.map(item => {
      const itemTotal = item.quantity * item.unitCost;
      totalAmount += itemTotal;
      return { product: item.product, quantity: item.quantity, cost: item.unitCost, total: itemTotal };
    });
    const sequence = await getNextSequenceValue('purchaseOrder');
    const poNumber = `PO-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;
    const purchaseOrder = new PurchaseOrder({
      poNumber,
      supplier, // This is just the ID
      items: processedItems,
      totalAmount,
      notes,
      supplierResponseToken: token,
      history: [{ status: 'Pending', notes: 'PO created by user.' }]
    });
    const createdPurchaseOrder = await purchaseOrder.save();
    logAction(req.user, 'CREATE_PO', `Created Purchase Order #${poNumber}`, { entityType: 'PurchaseOrder', entityId: createdPurchaseOrder._id });

    // Populate for the response
    const populatedPO = await PurchaseOrder.findById(createdPurchaseOrder._id).populate('supplier', 'name email'); // Populate email too

    // --- 3. SEND EMAIL ---
    if (populatedPO.supplier && populatedPO.supplier.email) {
        // Send email in the background, don't wait for it
        sendPoLink(
            populatedPO.supplier.email,
            populatedPO.supplier.name,
            populatedPO.poNumber,
            populatedPO.supplierResponseToken // Use the token from the populated PO
        ).catch(err => {
            console.error(`Failed to send PO email for ${poNumber}:`, err);
            // Log this failure, maybe add to PO history later?
        });
    } else {
        console.log(`Supplier email not found for PO ${poNumber}. Email not sent.`);
        // Optionally add a note to PO history?
    }
    // --- END SEND EMAIL ---

    res.status(201).json(populatedPO);
  } catch (error) {
    res.status(500).json({ message: 'Server error while creating purchase order.', error: error.message });
  }
};

// --- (Rest of the functions remain the same) ---

const getPurchaseOrderByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const purchaseOrder = await PurchaseOrder.findOne({ supplierResponseToken: token })
      .populate('supplier', 'name')
      .populate('items.product', 'name itemCode unit');

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order link is invalid or has expired.' });
    }

    if (['Approved', 'Completed', 'Cancelled'].includes(purchaseOrder.status)) {
        return res.status(400).json({ message: 'This purchase order has already been finalized.' });
    }
    res.json(purchaseOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching purchase order.', error: error.message });
  }
};

const updateBySupplier = async (req, res) => {
  try {
    const { token } = req.params;
    const { items, supplierNotes } = req.body;

    const po = await PurchaseOrder.findOne({ supplierResponseToken: token });
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found.' });
    }
     if (po.status !== 'Pending') {
      return res.status(400).json({ message: 'This PO has already been reviewed or actioned.' });
    }

    po.items.forEach(originalItem => {
        const updatedItem = items.find(i => i.product === originalItem.product.toString());

        if (updatedItem) {
            originalItem.supplierUpdatedCost = parseFloat(updatedItem.supplierUpdatedCost);
            originalItem.isAvailable = Boolean(updatedItem.isAvailable);
        }
    });

    let totalAmount = 0;
    po.items.forEach(item => {
        const costToUse = typeof item.supplierUpdatedCost === 'number' ? item.supplierUpdatedCost : item.cost;
        item.total = item.isAvailable ? item.quantity * costToUse : 0;
        totalAmount += item.total;
    });

    po.totalAmount = totalAmount;
    po.supplierNotes = supplierNotes;
    po.status = 'Awaiting Approval';
    po.history.push({ status: 'Awaiting Approval', notes: supplierNotes || 'Reviewed by supplier.', updatedBy: 'Supplier' });

    await po.save();
    res.json({ message: 'Purchase Order updated successfully. The buyer has been notified.' });

  } catch (error) {
    console.error('Error in updateBySupplier:', error);
    res.status(500).json({ message: 'Server error while updating purchase order.', error: error.toString() });
  }
};

const approveSupplierChanges = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found.' });
    }
    if (po.status !== 'Awaiting Approval') {
      return res.status(400).json({ message: `Cannot approve a PO with status '${po.status}'.` });
    }

    let finalTotalAmount = 0;
    const availableItems = [];

    po.items.forEach(item => {
      if (item.isAvailable) {
        if (typeof item.supplierUpdatedCost === 'number') {
          item.cost = item.supplierUpdatedCost;
        }
        item.total = item.quantity * item.cost;
        finalTotalAmount += item.total;
        availableItems.push(item);
      }
    });

    po.items = availableItems;
    po.totalAmount = finalTotalAmount;
    po.status = 'Approved';
    po.history.push({ status: 'Approved', notes: 'Supplier changes approved by user.', updatedBy: req.user.name });

    const updatedPurchaseOrder = await po.save();

    logAction(req.user, 'APPROVE_PO', `Approved supplier changes for PO #${po.poNumber}`, { entityType: 'PurchaseOrder', entityId: updatedPurchaseOrder._id });

    const populatedPO = await PurchaseOrder.findById(updatedPurchaseOrder._id)
      .populate('supplier', 'name')
      .populate('items.product', 'name itemCode unit');

    res.json(populatedPO);

  } catch (error) {
    res.status(500).json({ message: 'Server error during approval.', error: error.message });
  }
};

const getAllPurchaseOrders = async (req, res) => {
    try {
        const purchaseOrders = await PurchaseOrder.find({})
            .populate('supplier', 'name')
            .populate('items.product', 'name')
            .sort({ createdAt: -1 });
        res.json(purchaseOrders);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getPurchaseOrderById = async (req, res) => {
    try {
        const purchaseOrder = await PurchaseOrder.findById(req.params.id)
            .populate('supplier')
            .populate('items.product');
        if (purchaseOrder) {
            res.json(purchaseOrder);
        } else {
            res.status(404).json({ message: 'Purchase Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const updatePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, status } = req.body;

        const po = await PurchaseOrder.findById(id);
        if (!po) {
            return res.status(404).json({ message: 'Purchase Order not found' });
        }

        if (notes) po.notes = notes;
        if (status) po.status = status;

        const updatedPO = await po.save();
        logAction(req.user, 'UPDATE_PO', `Updated PO #${updatedPO.poNumber}`, { entityType: 'PurchaseOrder', entityId: updatedPO._id });

        res.json(updatedPO);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};


const receivePurchaseOrder = async (req, res) => {
  const io = req.app.get('socketio');
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found.' });
    }
    if (!['Approved', 'Partially Received'].includes(po.status)) {
      return res.status(400).json({ message: `Cannot receive stock for a PO with status '${po.status}'.` });
    }

    const receivedItems = JSON.parse(req.body.items);

    for (const receivedItem of receivedItems) {
      const poItem = po.items.find(p => p.product.toString() === receivedItem.productId);
      if (poItem) {
        const qtyToReceive = Number(receivedItem.quantityReceived);

        if (qtyToReceive > 0) {
            const product = await Product.findById(receivedItem.productId);
            if (!product) continue;

            const stockBefore = product.quantity;
            product.quantity = Number(product.quantity) + qtyToReceive;
            await product.save();

            await checkStockLevelAndNotify(product, io);

            poItem.quantityReceived = (poItem.quantityReceived || 0) + qtyToReceive;

            await logMovement({
              product: receivedItem.productId,
              type: 'DELIVERY (PO)',
              quantityChange: qtyToReceive,
              stockBefore: stockBefore,
              referenceId: po._id,
              recordedBy: req.user.id
            });
        }
      }
    }

    const isCompleted = po.items.every(item => (item.quantityReceived || 0) >= item.quantity);
    po.status = isCompleted ? 'Completed' : 'Partially Received';

    if (req.file) {
      po.receiptImageUrl = `/uploads/receipts/${req.file.filename}`;
    }

    po.history.push({
      status: po.status,
      notes: `Received stock. Receipt: ${req.file ? req.file.filename : 'Not uploaded.'}`,
      updatedBy: req.user.name
    });

    const updatedPO = await po.save();

    logAction(req.user, 'RECEIVE_PO_STOCK', `Received stock for PO #${po.poNumber}`, { entityType: 'PurchaseOrder', entityId: updatedPO._id });

    const populatedPO = await PurchaseOrder.findById(updatedPO._id)
      .populate('supplier')
      .populate('items.product');

    res.json({ message: 'Stock received and inventory updated successfully!', purchaseOrder: populatedPO });

  } catch (error) {
    console.error('Error receiving stock:', error);
    res.status(500).json({ message: 'Server error while receiving stock.', error: error.message });
  }
};


const cancelPurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) {
            return res.status(404).json({ message: 'Purchase Order not found' });
        }
        if (po.status === 'Completed' || po.status === 'Cancelled') {
            return res.status(400).json({ message: `Cannot cancel a PO with status '${po.status}'.` });
        }

        po.status = 'Cancelled';
        po.history.push({ status: 'Cancelled', notes: 'PO cancelled by user.', updatedBy: req.user.name });

        const updatedPO = await po.save();
        logAction(req.user, 'CANCEL_PO', `Cancelled PO #${updatedPO.poNumber}`, { entityType: 'PurchaseOrder', entityId: updatedPO._id });

        res.json({ message: 'Purchase Order cancelled successfully.' });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createPurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderById,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    updatePurchaseOrder,
    getPurchaseOrderByToken,
    updateBySupplier,
    approveSupplierChanges
};