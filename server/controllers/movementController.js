// server/controllers/movementController.js
const Movement = require('../models/movementModel');

const getProductMovements = async (req, res) => {
    try {
        const { productId } = req.params;
        const movements = await Movement.find({ product: productId })
            .sort({ createdAt: -1 })
            .populate('recordedBy', 'fullName');
        
        res.json(movements);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching movement history.', error: error.message });
    }
};

module.exports = { getProductMovements };