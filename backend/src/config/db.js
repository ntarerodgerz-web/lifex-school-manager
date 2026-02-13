const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

// Support a single DATABASE_URL (Neon, Railway, Supabase, etc.)
// or individual DB_HOST / DB_NAME / DB_USER / DB_PASSWORD vars
const poolConfig = env.databaseUrl
  ? {
      connectionString: env.databaseUrl,
      ssl: { rejectUnauthorized: false }, // Required for Neon and most cloud providers
      max: 10,                            // Neon free tier has connection limits
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', err);
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
