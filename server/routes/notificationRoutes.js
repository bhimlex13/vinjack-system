// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getNotifications, markNotificationsAsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getNotifications);

router.route('/read')
    .post(protect, markNotificationsAsRead);

module.exports = router;