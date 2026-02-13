/**
 * LIFEX School Manager - Production Entry Point
 * ──────────────────────────────────────────────
 * This file is the entry point for Hostinger Node.js hosting (Passenger).
 * It bootstraps the backend Express server and serves the frontend.
 */
const path = require('path');

// Ensure dotenv loads from backend/.env
require('dotenv').config({ path: path.resolve(__dirname, 'backend', '.env') });

const app = require('./backend/src/app');
const { pool } = require('./backend/src/config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.warn('⚠️ Database connection failed — API will start but DB-dependent routes will error.');
    console.warn(`DB error: ${error.message}`);
  }

  app.listen(PORT, () => {
    console.log(`🚀 LIFEX School Manager running on port ${PORT} [${process.env.NODE_ENV || 'production'}]`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

startServer();
