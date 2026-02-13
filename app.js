/**
 * LIFEX School Manager — Production Entry Point
 * ──────────────────────────────────────────────
 * Entry point for Hostinger Node.js hosting (Passenger).
 * Hostinger setting: Root dir = (empty), Entry file = app.js
 * OR: Root dir = backend, Entry file = ../app.js
 */
const path = require('path');
const fs = require('fs');

// Load environment variables from file
const envPaths = [
  path.resolve(__dirname, 'backend', '.env'),
  path.resolve(__dirname, 'backend', '.env.production'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const app = require('./backend/src/app');
const logger = require('./backend/src/utils/logger');
const { pool } = require('./backend/src/config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (error) {
    logger.warn('Database connection failed — API will start but DB-dependent routes will error.');
    logger.warn(`DB error: ${error.message}`);
  }

  app.listen(PORT, () => {
    logger.info(`LIFEX School Manager running on port ${PORT} [${process.env.NODE_ENV || 'production'}]`);
  });
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down...');
  await pool.end();
  process.exit(0);
});

startServer();
