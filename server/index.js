// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const startLowStockCheck = require('./jobs/cronJobs');

// --- ADDED: Imports for Socket.IO ---
const http = require('http');
const { Server } = require("socket.io");
// ---

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
const movementRoutes = require('./routes/movementRoutes');
const appSettingsRoutes = require('./routes/appSettingsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const adjustmentRoutes = require('./routes/adjustmentRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- MODIFIED: Create HTTP server and integrate Socket.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend's URL
    methods: ["GET", "POST"]
  }
});

// --- ADDED: Make `io` accessible to our controllers ---
app.set('socketio', io);

// --- ADDED: Socket.IO connection handling ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for a user to join their private room
  socket.on('joinRoom', (userId) => {
    socket.join(userId);
    console.log(`User with ID: ${userId} joined room.`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
// ---

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
app.use('/api/movements', movementRoutes);
app.use('/api/app-settings', appSettingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/adjustments', adjustmentRoutes);

// =================== PRODUCTION DEPLOYMENT CODE ===================
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
  });
}
// =================================================================

// Start the scheduled jobs
startLowStockCheck();

const PORT = process.env.PORT || 5000;

// MODIFIED: The http server listens, not the Express app
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));