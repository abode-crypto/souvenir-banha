const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');

require('dotenv').config();

const { getDatabase, closeDatabase } = require('./config/database');
const { logger, requestLogger } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
getDatabase();
logger.info('Database initialized');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'souvenir-banha-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(requestLogger);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// SPA fallback - serve index.html for non-API routes
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Error handler
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || err.message === 'صيغة الصورة غير مدعومة') {
    return res.status(400).json({ error: err.message });
  }
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  closeDatabase();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  closeDatabase();
  server.close(() => process.exit(0));
});

module.exports = app;