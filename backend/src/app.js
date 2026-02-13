const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const env = require('./config/env');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ──────────────────────────────────────────────
// Global Middleware
// ──────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.nodeEnv === 'development' ? true : env.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// ──────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'School Manager API is running', timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// API Routes (v1)
// ──────────────────────────────────────────────
app.use('/api/v1/auth', require('./modules/auth/routes'));
app.use('/api/v1/schools', require('./modules/schools/routes'));
app.use('/api/v1/users', require('./modules/users/routes'));
app.use('/api/v1/classes', require('./modules/classes/routes'));
app.use('/api/v1/subjects', require('./modules/subjects/routes'));
app.use('/api/v1/pupils', require('./modules/pupils/routes'));
app.use('/api/v1/teachers', require('./modules/teachers/routes'));
app.use('/api/v1/parents', require('./modules/parents/routes'));
app.use('/api/v1/attendance', require('./modules/attendance/routes'));
app.use('/api/v1/fees', require('./modules/fees/routes'));
app.use('/api/v1/payments', require('./modules/payments/routes'));
app.use('/api/v1/announcements', require('./modules/announcements/routes'));
app.use('/api/v1/assessments', require('./modules/assessments/routes'));
app.use('/api/v1/reports', require('./modules/reports/routes'));
app.use('/api/v1/subscriptions', require('./modules/subscriptions/routes'));
app.use('/api/v1/pesapal', require('./modules/pesapal/routes'));
app.use('/api/v1/broadcasts', require('./modules/broadcasts/routes'));
app.use('/api/v1/sms', require('./modules/sms/routes'));
app.use('/api/v1/campuses', require('./modules/campuses/routes'));
app.use('/api/v1/api-keys', require('./modules/apikeys/routes'));
app.use('/api/v1/external', require('./modules/apikeys/externalRoutes'));

// ──────────────────────────────────────────────
// Serve frontend in production
// ──────────────────────────────────────────────
if (env.nodeEnv === 'production') {
  // Try multiple possible frontend locations (handles different hosting setups)
  const possiblePaths = [
    path.resolve(__dirname, '../../frontend/dist'),   // Hostinger (root dir = backend)
    path.resolve(__dirname, '../frontend/dist'),       // Fallback
    path.resolve(process.cwd(), '../frontend/dist'),   // Relative to CWD
    path.resolve(process.cwd(), 'frontend/dist'),      // Root CWD
  ];

  const fs = require('fs');
  const frontendPath = possiblePaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || possiblePaths[0];

  app.use(express.static(frontendPath));

  // All non-API routes → React app (SPA client-side routing)
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/uploads/')) {
      return next();
    }
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).json({ success: false, message: 'Frontend not found. Searched: ' + possiblePaths.join(', ') });
    }
  });
}

// ──────────────────────────────────────────────
// 404 handler (API routes only in production)
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ──────────────────────────────────────────────
// Centralised error handler (must be last)
// ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;

