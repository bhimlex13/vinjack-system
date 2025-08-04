const express = require('express');
const router = express.Router();
const { getBrands, createBrand } = require('../controllers/brandController');

router.route('/').get(getBrands).post(createBrand);

module.exports = router;