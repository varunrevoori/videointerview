const express = require('express');
const app = express();
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const { connectDb } = require('./libs/db');

// Load environment variables
dotenv.config({ quiet: true });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const uploadRoutes = require('./routes/upload');
const paymentRoutes = require('./routes/payments');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TalentIQ Backend API is running',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const startServer = async () => {
  try {
    await connectDb();
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📱 API Health: http://localhost:${PORT}/`);
      console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();