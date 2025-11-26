// server/controllers/purchaseOrderController.js
const crypto = require('crypto');
const mongoose = require('mongoose');
const PurchaseOrder = require('../models/purchaseOrderModel');
const Counter = require('../models/counterModel');
const Product = require('../models/productModel');
const Supplier = require('../models/supplierModel');
const logAction = require('../utils/logger');
const logMovement = require('../utils/movementLogger');
const { checkStockLevelAndNotify } = require('../utils/stockManager');
const { 
  sendPoLink, 
  sendPOApprovalNotification,
  sendManualConsignmentNotification,
  sendPOCompletionNotification
} = require('../utils/emailService');
const { uploadFileToGCS, generateSignedUrl, downloadFileFromGCS } = require('../utils/gcsStorage');


// --- Helper: Get Next Sequence Number ---
async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName, { $inc: { seq: 1 } }, { new: true, upsert: true }
  );
  return sequenceDocument.seq;
}


// --- 1. CREATE PURCHASE ORDER ---
const createPurchaseOrder = async (req, res) => {
  try {
    const { 
      supplier, 
      items, 
      notes, 
      poType, 
      consignmentMethod, 
      termsAndConditions, 
      signedAgreementUrl 
    } = req.body;

    if (!supplier || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier and items are required.' });
    }

    // Validation: Manual Consignment requires an uploaded file immediately
    if (poType === 'Consignment' && consignmentMethod === 'Manual' && !signedAgreementUrl) {
      return res.status(400).json({ message: 'A signed agreement file must be uploaded for manual consignment.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    let totalAmount = 0;
    
    const processedItems = items.map(item => {
      const cost = item.unitCost || item.cost;
      const itemTotal = item.quantity * cost;
      totalAmount += itemTotal;
      return { 
        product: item.product, 
        quantity: item.quantity, 
        cost: cost, 
        total: itemTotal 
      };
    });

    const sequence = await getNextSequenceValue('purchaseOrder');
    const poNumber = `PO-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;

    // Determine initial status
    // Manual Consignment starts as 'Agreement Uploaded'. System Consignment starts as 'Pending'.
    const initialStatus = (poType === 'Consignment' && consignmentMethod === 'Manual') 
      ? 'Agreement Uploaded - Awaiting Delivery' 
      : 'Pending';

    const historyEntry = (poType === 'Consignment' && consignmentMethod === 'Manual')
      ? { status: initialStatus, notes: 'Manual consignment created with uploaded agreement.' }
      : { status: initialStatus, notes: 'PO created by user.' };

    // --- GCS UPLOAD LOGIC (For Manual Flow) ---
    let finalAgreementPath = ''; 
    let agreementBuffer = null;

    if (poType === 'Consignment' && consignmentMethod === 'Manual' && signedAgreementUrl) {
        // Extract Base64 Data
        const matches = signedAgreementUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (matches && matches.length === 3) {
            agreementBuffer = Buffer.from(matches[2], 'base64');
            const fileName = `consignment-agreements/${poNumber}_agreement.pdf`;
            
            try {
                // Upload to GCS and get the internal path
                finalAgreementPath = await uploadFileToGCS(agreementBuffer, fileName);
            } catch (uploadErr) {
                console.error("Failed to upload agreement to GCS:", uploadErr);
                return res.status(500).json({ message: 'Failed to upload agreement file to Cloud Storage.' });
            }
        } else {
             return res.status(400).json({ message: 'Invalid file format.' });
        }
    }

    const purchaseOrder = new PurchaseOrder({
      poNumber, 
      supplier, 
      items: processedItems, 
      totalAmount, 
      notes,
      poType: poType || 'Purchase',
      consignmentMethod: poType === 'Consignment' ? (consignmentMethod || 'System') : 'System',
      termsAndConditions: termsAndConditions || '',
      signedAgreementUrl: finalAgreementPath || '', // Store the GCS path
      status: initialStatus,
      supplierResponseToken: token, 
      history: [historyEntry]
    });

    const createdPurchaseOrder = await purchaseOrder.save();
    logAction(req.user, 'CREATE_PO', `Created Purchase Order #${poNumber} (${poType})`, { entityType: 'PurchaseOrder', entityId: createdPurchaseOrder._id });

    const populatedPO = await PurchaseOrder.findById(createdPurchaseOrder._id)
      .populate('supplier', 'name email')
      .populate('items.product', 'name');

    // --- EMAIL NOTIFICATIONS ---
    if (populatedPO.supplier && populatedPO.supplier.email) {
        if (poType === 'Consignment' && consignmentMethod === 'Manual') {
            // Manual: Send email with PDF Attachment
            sendManualConsignmentNotification(
              populatedPO.supplier.email,
              populatedPO.supplier.name,
              populatedPO.poNumber,
              populatedPO.items,
              agreementBuffer // Pass the buffer to attach it
            ).catch(err => console.error('Failed to send manual consignment email:', err));

        } else {
            // System/Purchase: Send Link
            sendPoLink(
                populatedPO.supplier.email, 
                populatedPO.supplier.name,
                populatedPO.poNumber, 
                populatedPO.supplierResponseToken
            ).catch(err => console.error(`Failed to send PO email for ${poNumber}:`, err));
        }
    }

    res.status(201).json(populatedPO);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ message: 'Server error while creating purchase order.', error: error.message });
  }
};


// --- 2. GET PO BY ID (Admin View) ---
const getPurchaseOrderById = async (req, res) => {
    try {
        let purchaseOrder = await PurchaseOrder.findById(req.params.id)
            .populate('supplier')
            .populate('items.product')
            .lean();

        if (purchaseOrder) {
            // Generate Signed URL for Initial Agreement if it exists in GCS
            if (purchaseOrder.signedAgreementUrl && purchaseOrder.signedAgreementUrl.includes('consignment-agreements/')) {
                const signedUrl = await generateSignedUrl(purchaseOrder.signedAgreementUrl);
                if (signedUrl) {
                    purchaseOrder.signedAgreementUrl = signedUrl;
                }
            }
            // Generate Signed URL for Countersigned Agreement if it exists
            if (purchaseOrder.countersignedAgreementUrl && purchaseOrder.countersignedAgreementUrl.includes('consignment-agreements/')) {
                const signedUrl = await generateSignedUrl(purchaseOrder.countersignedAgreementUrl);
                if (signedUrl) {
                    purchaseOrder.countersignedAgreementUrl = signedUrl;
                }
            }
            res.json(purchaseOrder);
        } else {
            res.status(404).json({ message: 'Purchase Order not found' });
        }
    } catch (error) {
        console.error('Error fetching PO by ID:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


// --- 3. GET PO BY TOKEN (Supplier View) ---
const getPurchaseOrderByToken = async (req, res) => {
  try {
    const { token } = req.params;
    let purchaseOrder = await PurchaseOrder.findOne({ supplierResponseToken: token })
      .populate('supplier', 'name')
      .populate('items.product', 'name itemCode unit')
      .lean();

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order link is invalid or has expired.' });
    }
    
    // NOTE: We do NOT block access based on status here anymore.
    // We allow the frontend to load the PO so it can show the "Review Submitted" status tracker.

    // Generate signed URL for Supplier Signed Doc
    if (purchaseOrder.signedAgreementUrl && purchaseOrder.signedAgreementUrl.includes('consignment-agreements/')) {
        const signedUrl = await generateSignedUrl(purchaseOrder.signedAgreementUrl);
        if (signedUrl) {
            purchaseOrder.signedAgreementUrl = signedUrl;
        }
    }
    
    // Generate signed URL for Countersigned Doc (so supplier can download final version)
    if (purchaseOrder.countersignedAgreementUrl && purchaseOrder.countersignedAgreementUrl.includes('consignment-agreements/')) {
        const signedUrl = await generateSignedUrl(purchaseOrder.countersignedAgreementUrl);
        if (signedUrl) {
            purchaseOrder.countersignedAgreementUrl = signedUrl;
        }
    }

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Error fetching PO by token:', error);
    res.status(500).json({ message: 'Server error while fetching purchase order.', error: error.message });
  }
};


// --- 4. UPDATE BY SUPPLIER (Submit Review/Upload) ---
const updateBySupplier = async (req, res) => {
  try {
    const { token } = req.params;
    const { items, supplierNotes, signedAgreementUrl } = req.body;

    const po = await PurchaseOrder.findOne({ supplierResponseToken: token });
    if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });
    
    // Strict check: Suppliers can only update if status is 'Pending'.
    if (po.status !== 'Pending') {
        return res.status(400).json({ message: 'This PO has already been reviewed or actioned.' });
    }

    // Update item costs/availability
    po.items.forEach(originalItem => {
        const updatedItem = items.find(i => i.product && i.product.toString() === originalItem.product.toString());
        if (updatedItem) {
            originalItem.supplierUpdatedCost = parseFloat(updatedItem.supplierUpdatedCost);
            originalItem.isAvailable = Boolean(updatedItem.isAvailable);
        }
    });

    // Recalculate totals based on supplier input
    let newTotalAmount = 0;
    po.items.forEach(item => {
        const costToUse = typeof item.supplierUpdatedCost === 'number' ? item.supplierUpdatedCost : item.cost;
        item.total = item.isAvailable ? item.quantity * costToUse : 0;
        newTotalAmount += item.total;
    });

    po.totalAmount = newTotalAmount;
    po.supplierNotes = supplierNotes;
    po.status = 'Awaiting Approval';
    
    // --- GCS UPLOAD LOGIC (Supplier Uploading Signed Agreement) ---
    if (signedAgreementUrl) {
        const matches = signedAgreementUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            const fileName = `consignment-agreements/${po.poNumber}_signed_supplier.pdf`;
            try {
                const gcsPath = await uploadFileToGCS(buffer, fileName);
                po.signedAgreementUrl = gcsPath; 
            } catch (err) {
                console.error("Supplier upload failed:", err);
                return res.status(500).json({ message: 'Failed to upload agreement file.' });
            }
        }
    }

    po.history.push({ status: 'Awaiting Approval', notes: supplierNotes || 'Reviewed by supplier.', updatedBy: 'Supplier' });

    await po.save();
    res.json({ message: 'Purchase Order updated successfully. The buyer has been notified.' });

  } catch (error) {
    console.error('Error in updateBySupplier:', error);
    res.status(500).json({ message: 'Server error while updating purchase order.', error: error.toString() });
  }
};


// --- 5. APPROVE SUPPLIER CHANGES (Standard Flow) ---
const approveSupplierChanges = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).populate('supplier', 'name email');
    if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });
    
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
    
    // Status update
    // Note: For System Consignment, true approval happens at 'uploadCountersignedAgreement'.
    // This function handles Standard POs or manual overrides.
    po.status = 'Approved';

    po.history.push({ status: po.status, notes: 'Supplier changes approved by user.', updatedBy: req.user.name });

    const updatedPurchaseOrder = await po.save();

    logAction(req.user, 'APPROVE_PO', `Approved supplier changes for PO #${po.poNumber}`, { entityType: 'PurchaseOrder', entityId: updatedPurchaseOrder._id });

    // For Standard POs, send approval email immediately
    if (po.poType !== 'Consignment' && po.supplier && po.supplier.email) { 
        sendPOApprovalNotification(
            po.supplier.email,
            po.supplier.name,
            po.poNumber
        ).catch(err => {
            console.error(`Failed to send PO Approval email for ${po.poNumber}:`, err);
        });
    }

    const populatedPO = await PurchaseOrder.findById(updatedPurchaseOrder._id)
      .populate('supplier', 'name')
      .populate('items.product', 'name itemCode unit');

    res.json(populatedPO);

  } catch (error) {
    console.error('Error approving PO:', error);
    res.status(500).json({ message: 'Server error during approval.', error: error.message });
  }
};


// --- 6. UPLOAD COUNTERSIGNED AGREEMENT (System Consignment Final Step) ---
const uploadCountersignedAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { countersignedAgreementUrl } = req.body; 

    const po = await PurchaseOrder.findById(id).populate('supplier', 'name email');
    if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });
    
    let finalPath = '';
    let pdfBuffer = null;

    const matches = countersignedAgreementUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        pdfBuffer = Buffer.from(matches[2], 'base64');
        const fileName = `consignment-agreements/${po.poNumber}_countersigned.pdf`;
        try {
            finalPath = await uploadFileToGCS(pdfBuffer, fileName);
        } catch (err) {
            console.error("GCS Upload Error:", err);
            return res.status(500).json({ message: "Failed to upload file." });
        }
    } else {
        return res.status(400).json({ message: 'Invalid file format.' });
    }

    po.countersignedAgreementUrl = finalPath;
    po.status = 'Approved'; // Ready for delivery
    po.history.push({ status: 'Approved', notes: 'Countersigned agreement uploaded. PO Approved.', updatedBy: req.user.name });

    const updatedPO = await po.save();

    logAction(req.user, 'UPLOAD_COUNTERSIGNED', `Uploaded countersigned agreement for PO #${po.poNumber}`, { entityType: 'PurchaseOrder', entityId: po._id });

    // Send Email to Supplier with Attachment
    if (po.supplier?.email) {
        sendPOApprovalNotification(po.supplier.email, po.supplier.name, po.poNumber, pdfBuffer)
            .catch(err => console.error('Failed to send approval email:', err));
    }
    
    // Respond with updated object (generate signed urls so frontend can display)
    const responseObj = updatedPO.toObject();
    if(responseObj.signedAgreementUrl) responseObj.signedAgreementUrl = await generateSignedUrl(responseObj.signedAgreementUrl);
    if(responseObj.countersignedAgreementUrl) responseObj.countersignedAgreementUrl = await generateSignedUrl(responseObj.countersignedAgreementUrl);

    res.json(responseObj);

  } catch (error) {
    console.error('Error uploading countersigned agreement:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};


// --- 7. RECEIVE STOCK (Includes Serialization Logic) ---
const receivePurchaseOrder = async (req, res) => {
  const io = req.app.get('socketio');
  const session = await mongoose.startSession();
  try {
    session.startTransaction(); 

    const po = await PurchaseOrder.findById(req.params.id).populate('supplier', 'name email').session(session);
    if (!po) {
      throw new Error('Purchase Order not found.');
    }
    
    const allowedStatuses = ['Approved', 'Partially Received', 'Agreement Uploaded - Awaiting Delivery'];
    if (!allowedStatuses.includes(po.status)) {
      throw new Error(`Cannot receive stock for a PO with status '${po.status}'.`);
    }

    const { items: receivedItems, deliveryReceiptUrl } = req.body;

    let itemsActuallyReceived = false;
    
    if (!Array.isArray(receivedItems)) {
        throw new Error('Invalid format for received items.');
    }

    for (const receivedItem of receivedItems) {
      const poItem = po.items.find(p => p.product.toString() === receivedItem.productId);
      if (poItem) {
        const qtyToReceive = Number(receivedItem.quantityReceived);
        const maxReceivable = poItem.quantity - (poItem.quantityReceived || 0);
        
        // --- SERIALIZATION CHECK ---
        const receivedSerials = receivedItem.serialNumbers || [];
        if (receivedSerials.length > 0 && receivedSerials.length !== qtyToReceive) {
             throw new Error(`Quantity to receive (${qtyToReceive}) must match the number of serial numbers provided (${receivedSerials.length}) for product ID ${receivedItem.productId}.`);
        }
        // ---------------------------

        if (qtyToReceive > 0 && qtyToReceive <= maxReceivable) {
            itemsActuallyReceived = true;
            
            const product = await Product.findById(receivedItem.productId).session(session);
            if (!product) {
                console.warn(`Product ID ${receivedItem.productId} not found during PO receive for ${po.poNumber}`);
                continue; 
            }

            const stockBefore = product.quantity;
            product.quantity = Number(product.quantity) + qtyToReceive;

            if (po.poType === 'Consignment') {
              product.consignedStock = (Number(product.consignedStock) || 0) + qtyToReceive;
            }

            // --- SERIALIZATION STORAGE LOGIC ---
            if (product.isSerialized && receivedSerials.length > 0) {
              const poReference = po._id;
              
              receivedSerials.forEach(sn => {
                const exists = product.serializedItems.some(s => s.serialNumber === sn);
                if (exists) {
                   throw new Error(`Serial Number ${sn} for ${product.name} already exists in inventory.`);
                }
                
                product.serializedItems.push({
                  serialNumber: sn,
                  status: 'Available',
                  purchaseOrder: poReference,
                  dateReceived: new Date(),
                });
              });
              
              // Add to PO Item record
              poItem.serialNumbers = [...(poItem.serialNumbers || []), ...receivedSerials];
            }
            // -----------------------------------

            await product.save({ session });
            
            poItem.quantityReceived = (poItem.quantityReceived || 0) + qtyToReceive;

            await logMovement({
              product: receivedItem.productId,
              type: po.poType === 'Consignment' ? 'DELIVERY (CONSIGN)' : 'DELIVERY (PO)',
              quantityChange: qtyToReceive,
              stockBefore: stockBefore,
              referenceId: po._id,
              recordedBy: req.user.id
            }, { session }); 
        } else if (qtyToReceive > maxReceivable) {
            console.warn(`Attempted to receive ${qtyToReceive} for product ${receivedItem.productId} on PO ${po.poNumber}, but only ${maxReceivable} were remaining.`);
        }
      }
    }

    const isCompleted = po.items.every(item => (item.quantityReceived || 0) >= item.quantity);
    po.status = isCompleted ? 'Completed' : (itemsActuallyReceived || po.status === 'Partially Received' ? 'Partially Received' : 'Approved');
    
    if (deliveryReceiptUrl) {
      po.deliveryReceiptUrl = deliveryReceiptUrl; 
    }

    po.history.push({
      status: po.status,
      notes: `Received stock. ${itemsActuallyReceived ? '' : 'No items received in this transaction.'} Receipt: ${deliveryReceiptUrl ? 'Uploaded' : 'Not uploaded.'}`,
      updatedBy: req.user.name
    });

    const updatedPO = await po.save({ session });

    await session.commitTransaction(); 
    session.endSession();

    try {
      for (const receivedItem of receivedItems) {
        if (receivedItem.quantityReceived > 0) {
          const product = await Product.findById(receivedItem.productId);
          if (product) await checkStockLevelAndNotify(product, io);
        }
      }
    } catch (notifyError) {
      console.error("Failed to send stock notifications after PO receive:", notifyError);
    }

    // --- COMPLETION EMAIL WITH ATTACHMENT ---
    if (po.supplier?.email && itemsActuallyReceived) {
        const fileToSend = po.countersignedAgreementUrl || po.signedAgreementUrl;
        let pdfBuffer = null;
        
        if (fileToSend) {
            try {
                pdfBuffer = await downloadFileFromGCS(fileToSend);
            } catch (dlErr) {
                console.error("Failed to download agreement for email attachment:", dlErr);
            }
        }

        sendPOCompletionNotification(po.supplier.email, po.supplier.name, po.poNumber, pdfBuffer)
            .catch(err => console.error("Failed to send completion email:", err));
    }
    // ----------------------------------------

    logAction(req.user, 'RECEIVE_PO_STOCK', `Received stock for PO #${po.poNumber}. Status: ${updatedPO.status}`, { entityType: 'PurchaseOrder', entityId: updatedPO._id });

    const populatedPO = await PurchaseOrder.findById(updatedPO._id)
      .populate('supplier')
      .populate('items.product');

    res.json({ message: 'Stock received and inventory updated successfully!', purchaseOrder: populatedPO });

  } catch (error) {
    await session.abortTransaction(); 
    session.endSession();
    console.error('Error receiving stock:', error);
    res.status(500).json({ message: 'Server error while receiving stock.', error: error.message });
  }
};


// --- 8. UTILITY FUNCTIONS (Get All, Cancel, Manual Update, Upload Signed) ---

const getAllPurchaseOrders = async (req, res) => {
    try {
        const purchaseOrders = await PurchaseOrder.find({})
            .populate('supplier', 'name')
            .populate('items.product', 'name')
            .sort({ createdAt: -1 });
        res.json(purchaseOrders);
    } catch (error) {
        console.error('Error fetching all POs:', error);
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

        let updated = false;
        if (notes && po.notes !== notes) {
             po.notes = notes;
             updated = true;
        }
        if (status && po.status !== status) {
            po.status = status;
            po.history.push({ status: status, notes: `Status manually updated by ${req.user.name}.`, updatedBy: req.user.name });
            updated = true;
        }

        if(!updated) {
            return res.json(po);
        }

        const updatedPO = await po.save();
        logAction(req.user, 'UPDATE_PO', `Manually updated PO #${updatedPO.poNumber}`, { entityType: 'PurchaseOrder', entityId: updatedPO._id });

        res.json(updatedPO);
    } catch (error) {
        console.error('Error updating PO:', error);
        res.status(500).json({ message: 'Server error' });
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
        console.error('Error cancelling PO:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const uploadSignedAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const { signedAgreementUrl } = req.body; 

    const po = await PurchaseOrder.findById(id);
    if (!po) return res.status(404).json({ message: 'Purchase Order not found.' });
    if (po.poType !== 'Consignment') {
      return res.status(400).json({ message: 'This PO is not a consignment order.' });
    }
    
    if (['Completed', 'Cancelled'].includes(po.status)) {
       return res.status(400).json({ message: `Cannot upload agreement for finalized PO.` });
    }

    let finalAgreementPath = '';
    
    const matches = signedAgreementUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `consignment-agreements/${po.poNumber}_signed_admin.pdf`;
        try {
            finalAgreementPath = await uploadFileToGCS(buffer, fileName);
        } catch (err) {
            console.error("Error uploading to GCS:", err);
            return res.status(500).json({ message: "Failed to upload file." });
        }
    }

    po.signedAgreementUrl = finalAgreementPath;
    po.status = 'Agreement Uploaded - Awaiting Delivery';
    po.history.push({ status: po.status, notes: 'Agreement uploaded by admin.', updatedBy: req.user.name });

    const updatedPO = await po.save();
    
    let responseSignedUrl = updatedPO.signedAgreementUrl;
    if (responseSignedUrl && responseSignedUrl.includes('consignment-agreements/')) {
        responseSignedUrl = await generateSignedUrl(responseSignedUrl);
    }

    const result = updatedPO.toObject();
    result.signedAgreementUrl = responseSignedUrl;

    logAction(req.user, 'UPLOAD_PO_AGREEMENT', `Uploaded agreement for PO #${updatedPO.poNumber}`, { entityType: 'PurchaseOrder', entityId: updatedPO._id });
    
    res.json(result);

  } catch (error) {
    console.error('Error uploading signed agreement:', error);
    res.status(500).json({ message: 'Server error uploading agreement.', error: error.message });
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
    approveSupplierChanges,
    uploadSignedAgreement,
    uploadCountersignedAgreement
};