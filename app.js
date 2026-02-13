/**
 * Hostinger Shared Hosting Entry Point
 * ─────────────────────────────────────
 * Hostinger's Passenger app server looks for app.js in the application root.
 * This file bootstraps the backend and starts the server.
 */
const app = require('./backend/src/app');
const { pool } = require('./backend/src/config/db');
const logger = require('./backend/src/utils/logger');

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
    logger.info(`School Manager API running on port ${PORT} [${process.env.NODE_ENV || 'production'}]`);
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

