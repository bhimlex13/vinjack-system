// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const startLowStockCheck = require('./jobs/cronJobs');

// Import Routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const saleRoutes = require('./routes/saleRoutes');
const reportRoutes = require('./routes/reportRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
// ADDED: Import the new movement routes
const movementRoutes = require('./routes/movementRoutes'); 
const appSettingsRoutes = require('./routes/appSettingsRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/settings', settingsRoutes);
// ADDED: Register the new movement routes
app.use('/api/movements', movementRoutes);
app.use('/api/app-settings', appSettingsRoutes);

// Start the scheduled jobs
startLowStockCheck();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));