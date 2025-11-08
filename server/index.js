// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Ensure path is imported
const connectDB = require('./config/db');
// --- MODIFIED: Import the correct named export ---
const { startScheduledJobs } = require('./jobs/cronJobs'); // Changed from startLowStockCheck
const mongoose = require('mongoose'); // Import mongoose for graceful shutdown

const http = require('http');
const { Server } = require("socket.io");

// Import Routes
const customerRoutes = require('./routes/customerRoutes');
const returnRoutes = require('./routes/returnRoutes');
const motorcycleRoutes = require('./routes/motorcycleRoutes');
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
const permissionRoutes = require('./routes/permissionRoutes'); // <-- NEW

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // It's better to use the specific client URL from .env in production
    origin: process.env.CLIENT_URL || "*", // Use "*" for development if needed, but restrict in prod
    methods: ["GET", "POST"]
  }
});

// Make io accessible in controllers via req.app.get('socketio')
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (userId) => {
    // Add validation/check if userId is provided and valid
    if (userId) {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room ${userId}.`);
    } else {
      console.log(`Socket ${socket.id} attempted to join room with invalid userId.`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/motorcycles', motorcycleRoutes);
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
app.use('/api/permissions', permissionRoutes); // <-- NEW

// Serve static upload files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =================== PRODUCTION DEPLOYMENT CODE ===================
// Serve frontend static files if in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
  console.log(`Serving static files from: ${clientBuildPath}`); // Log path for debugging
  app.use(express.static(clientBuildPath));

  // Serve index.html for any other requests that don't match API or static files
  app.get('*', (req, res) => {
    const indexPath = path.resolve(__dirname, '..', 'client', 'build', 'index.html');
    console.log(`Serving index.html from: ${indexPath}`); // Log path for debugging
    res.sendFile(indexPath);
  });
}
// =================================================================

const PORT = process.env.PORT || 5000;

// Start server listening
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // --- MODIFIED: Call the correct function name AFTER server starts listening ---
  try {
    startScheduledJobs();
  } catch (error) {
      console.error("Failed to start scheduled jobs:", error);
  }
  // --- END MODIFICATION ---

});


// --- Added Graceful Shutdown Logic ---
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false).then(() => { // false doesn't force close immediately
        console.log('MongoDB connection closed.');
        process.exit(0); // Exit cleanly
    }).catch(err => { // Catch potential errors during DB close
        console.error('Error closing MongoDB connection:', err);
        process.exit(1); // Exit with error code
    });
  });

  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

// Listen for termination signals
process.on('SIGTERM', () => shutdown('SIGTERM')); // e.g., kill command
process.on('SIGINT', () => shutdown('SIGINT')); // e.g., Ctrl+C

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`, err);
  // Consider shutting down on critical errors
  // server.close(() => process.exit(1));
});
// --- End Graceful Shutdown Logic ---