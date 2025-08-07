// server/controllers/auditLogController.js
const AuditLog = require('../models/auditLogModel');

const getLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find({})
            .sort({ createdAt: -1 }) // Show most recent logs first
            .populate('user', 'fullName'); // Show the user's name
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getLogs };