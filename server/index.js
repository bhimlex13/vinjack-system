require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); 
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const saleRoutes = require('./routes/saleRoutes');
const reportRoutes = require('./routes/reportRoutes');
const supplierRoutes = require('./routes/supplierRoutes'); 
const deliveryRoutes = require('./routes/deliveryRoutes'); 
const auditLogRoutes = require('./routes/auditLogRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json()); 

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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));