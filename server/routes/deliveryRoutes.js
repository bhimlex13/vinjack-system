// server/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();

// This line imports the functions from your controller.
const { createDelivery, getDeliveries } = require('../controllers/deliveryController');

// This line uses the imported functions as handlers for the route.
// The error was happening here because 'createDelivery' was likely undefined due to a typo.
router.route('/').get(getDeliveries).post(createDelivery);

module.exports = router;