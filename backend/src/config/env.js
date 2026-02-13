const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from files.
// Priority: .env (local dev) → .env.production (Hostinger deployment)
// Hostinger env vars set in UI are already in process.env and won't be overridden by dotenv.
const envPaths = [
  path.resolve(__dirname, '../../.env'),              // backend/.env (local dev)
  path.resolve(__dirname, '../../.env.production'),   // backend/.env.production (production)
  path.resolve(process.cwd(), '.env'),                // CWD/.env
  path.resolve(process.cwd(), '.env.production'),     // CWD/.env.production
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Support both individual DB vars and a single DATABASE_URL connection string (Neon, Railway, etc.)
  databaseUrl: process.env.DATABASE_URL || '',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'school_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  pesapal: {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY,
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
    // Use sandbox for development, live for production
    baseUrl: process.env.PESAPAL_BASE_URL || 'https://pay.pesapal.com/v3',
    ipnCallbackUrl: process.env.PESAPAL_IPN_CALLBACK_URL || 'http://localhost:5000/api/v1/pesapal/ipn',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'School Manager',
  },

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

