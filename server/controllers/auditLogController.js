// server/controllers/auditLogController.js
const AuditLog = require('../models/auditLogModel');

const getLogs = async (req, res) => {
    try {
        // --- MODIFIED: Read filters and pagination from query ---
        const { page = 1, limit = 20, search, userId, action } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // --- ADDED: Build a dynamic filter object ---
        const filter = {};
        if (userId) {
            filter.user = userId;
        }
        if (action) {
            filter.action = action;
        }
        if (search) {
            // Case-insensitive search on the 'details' field
            filter.details = { $regex: search, $options: 'i' };
        }

        // Execute queries with the filter object
        const [logs, totalLogs] = await Promise.all([
            AuditLog.find(filter) // Apply filter
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('user', 'fullName'),
            AuditLog.countDocuments(filter) // Apply filter to get the correct total
        ]);

        res.json({
            logs,
            totalLogs,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalLogs / parseInt(limit))
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getLogs };