/**
 * LIFEX School Manager - Production Entry Point
 * ──────────────────────────────────────────────
 * Entry point for Hostinger Node.js hosting (Passenger).
 */
const path = require('path');
const fs = require('fs');

// Load .env first (local dev). If not found, fall back to .env.production (Hostinger)
const devEnvPath = path.resolve(__dirname, 'backend', '.env');
const prodEnvPath = path.resolve(__dirname, 'backend', '.env.production');

if (fs.existsSync(devEnvPath)) {
  require('dotenv').config({ path: devEnvPath });
} else if (fs.existsSync(prodEnvPath)) {
  require('dotenv').config({ path: prodEnvPath });
}

const app = require('./backend/src/app');
const { pool } = require('./backend/src/config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
  } catch (error) {
    console.warn('Database connection failed — API will start but DB-dependent routes will error.');
    console.warn(`DB error: ${error.message}`);
  }

  app.listen(PORT, () => {
    console.log(`LIFEX School Manager running on port ${PORT} [${process.env.NODE_ENV || 'production'}]`);
  });
};

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

startServer();
