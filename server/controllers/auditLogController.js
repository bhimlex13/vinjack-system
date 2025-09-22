// server/controllers/auditLogController.js
const AuditLog = require('../models/auditLogModel');

const getLogs = async (req, res) => {
    try {
        // --- ADDED: Pagination Logic ---
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Default to 20 items per page
        const skip = (page - 1) * limit;

        // Execute two queries in parallel: one for the logs on the page, one for the total count
        const [logs, totalLogs] = await Promise.all([
            AuditLog.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'fullName'),
            AuditLog.countDocuments()
        ]);

        // Send back both the logs and the total count
        res.json({
            logs,
            totalLogs,
            currentPage: page,
            totalPages: Math.ceil(totalLogs / limit)
        });
        // --- END ADDED ---

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getLogs };