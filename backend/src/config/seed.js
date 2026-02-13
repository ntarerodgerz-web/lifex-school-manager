/**
 * Seed Script – creates a SUPER_ADMIN user for first-time setup.
 * Run: npm run seed
 */
const bcrypt = require('bcrypt');
const { pool } = require('./db');
const logger = require('../utils/logger');

async function seed() {
  try {
    const passwordHash = await bcrypt.hash('Admin@123', 12);

    // Check if super admin already exists
    const existing = await pool.query(
      `SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1`
    );

    if (existing.rows.length > 0) {
      logger.info('Super admin already exists. Skipping seed.');
      process.exit(0);
    }

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['Super', 'Admin', 'admin@schoolmanager.com', passwordHash, 'SUPER_ADMIN']
    );

    logger.info('Super admin created: admin@schoolmanager.com / Admin@123');
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();

