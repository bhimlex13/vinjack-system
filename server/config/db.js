// server/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // --- MODIFIED: Use MONGODB_URI ---
    if (!process.env.MONGODB_URI) {
        throw new Error('MongoDB connection string (MONGODB_URI) not found in environment variables.');
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    // --- END MODIFICATION ---

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;