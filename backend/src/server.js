const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { pool } = require('./config/db');

const startServer = async () => {
  logger.info(`Starting LIFEX School Manager...`);
  logger.info(`Node env: ${env.nodeEnv}`);
  logger.info(`Port: ${env.port}`);
  logger.info(`Database: ${env.databaseUrl ? 'DATABASE_URL (cloud)' : `${env.db.host}:${env.db.port}/${env.db.database}`}`);

  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (error) {
    logger.warn('Database connection failed — API will start but DB-dependent routes will error.');
    logger.warn(`DB error: ${error.message}`);
  }

  app.listen(env.port, () => {
    logger.info(`School Manager API running on port ${env.port} [${env.nodeEnv}]`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down...');
  await pool.end();
  process.exit(0);
});

startServer();
