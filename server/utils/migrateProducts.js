// server/utils/migrateProducts.js
const Product = require('../models/productModel');

const migrateProductData = async () => {
  try {
    const result = await Product.updateMany(
      { $or: [{ price: { $exists: false } }, { reorderLevel: { $exists: false } }] },
      { $set: { price: 0, reorderLevel: 5 } }
    );

    if (result.modifiedCount > 0) {
      console.log(`Product migration successful: ${result.modifiedCount} documents updated.`);
    } else {
      console.log('Product migration: No documents needed updating.');
    }
  } catch (error) {
    console.error('Error during product data migration:', error);
  }
};

module.exports = migrateProductData;