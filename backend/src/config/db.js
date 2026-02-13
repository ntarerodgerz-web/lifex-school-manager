const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
  process.exit(-1);
});

/**
 * Execute a query against the database
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (env.nodeEnv === 'development') {
    logger.debug(`Query executed in ${duration}ms`, {
      text: text.substring(0, 100),
      rows: result.rowCount,
    });
  }

  return result;
};

/**
 * Get a client from the pool (for transactions)
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = async () => {
  return pool.connect();
};

module.exports = { query, getClient, pool };

