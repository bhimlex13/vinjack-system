// server/controllers/consignmentController.js
const ConsignmentPayable = require('../models/consignmentPayableModel');
const logAction = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * @desc    Get all 'Owed' consignment payables
 * @route   GET /api/consignment/owed
 * @access  Admin, Super Admin
 */
const getOwedPayables = async (req, res) => {
  try {
    const payables = await ConsignmentPayable.find({ status: 'Owed' })
      .sort({ createdAt: -1 })
      .populate('product', 'name itemCode')
      .populate('supplier', 'name')
      .populate('sale', 'createdAt')
      .populate('recordedBy', 'fullName');
      
    res.json(payables);
  } catch (error) {
    console.error("Error fetching owed payables:", error);
    res.status(500).json({ message: 'Server error fetching owed payables.' });
  }
};

/**
 * @desc    Mark a consignment payable as 'Paid'
 * @route   PUT /api/consignment/:id/pay
 * @access  Admin, Super Admin
 */
const markPayableAsPaid = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid payable ID.' });
  }
  
  try {
    const payable = await ConsignmentPayable.findById(id);
    
    if (!payable) {
      return res.status(404).json({ message: 'Consignment payable record not found.' });
    }
    
    if (payable.status === 'Paid') {
      return res.status(400).json({ message: 'This payable has already been marked as paid.' });
    }

    payable.status = 'Paid';
    payable.paidDate = new Date();
    
    const updatedPayable = await payable.save();
    
    logAction(
      req.user,
      'PAY_CONSIGNMENT',
      `Marked consignment payable ${updatedPayable._id} (Amount: ₱${updatedPayable.amountOwed}) as Paid.`,
      { entityType: 'ConsignmentPayable', entityId: updatedPayable._id }
    );
    
    res.json(updatedPayable);
    
  } catch (error) {
    console.error("Error marking payable as paid:", error);
    res.status(500).json({ message: 'Server error while updating payable.' });
  }
};

// --- NEW FUNCTION ---
/**
 * @desc    Get all 'Paid' consignment payables (history)
 * @route   GET /api/consignment/history
 * @access  Admin, Super Admin
 */
const getPayoutHistory = async (req, res) => {
  try {
    const payables = await ConsignmentPayable.find({ status: 'Paid' })
      .sort({ paidDate: -1 }) // Sort by when it was paid
      .populate('product', 'name itemCode')
      .populate('supplier', 'name')
      .populate('sale', 'createdAt')
      .populate('recordedBy', 'fullName'); // User who created the payable
      
    res.json(payables);
  } catch (error) {
    console.error("Error fetching payout history:", error);
    res.status(500).json({ message: 'Server error fetching payout history.' });
  }
};
// --- END NEW FUNCTION ---

module.exports = {
  getOwedPayables,
  markPayableAsPaid,
  // --- EXPORT NEW FUNCTION ---
  getPayoutHistory
};