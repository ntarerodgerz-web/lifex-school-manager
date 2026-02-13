const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const db = require('../../config/db');
const authModel = require('./model');

const SALT_ROUNDS = 12;

/**
 * Generate JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      schoolId: user.school_id,
      role: user.role,
      email: user.email,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
};

/**
 * Login with email/phone + password
 */
const login = async ({ email, phone, password }) => {
  // Find user by email or phone
  let user;
  if (email) {
    user = await authModel.findByEmail(email);
  } else if (phone) {
    user = await authModel.findByPhone(phone);
  }

  if (!user) {
    const err = new Error('Invalid credentials. Please check your email/phone and password.');
    err.statusCode = 401;
    throw err;
  }

  // Check if school is active (skip for SUPER_ADMIN)
  if (user.role !== 'SUPER_ADMIN' && user.school_active === false) {
    const err = new Error('Your school account has been deactivated. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid credentials. Please check your email/phone and password.');
    err.statusCode = 401;
    throw err;
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store refresh token
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
  await authModel.storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

  // Update last login
  await authModel.updateLastLogin(user.id);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      school_id: user.school_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar_url: user.avatar_url,
      school_name: user.school_name,
      school_badge_url: user.school_badge_url || null,
      plan_type: user.plan_type || 'starter',
      subscription_status: user.subscription_status || 'trial',
      trial_ends_at: user.trial_ends_at || null,
      subscription_expires_at: user.subscription_expires_at || null,
      primary_color: user.primary_color || null,
      secondary_color: user.secondary_color || null,
      font_family: user.font_family || null,
      font_style: user.font_style || null,
    },
  };
};

/**
 * Register a new school with its admin user (self-signup flow)
 */
const registerSchool = async (data) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Create school
    const schoolResult = await client.query(
      `INSERT INTO schools (name, email, phone, address, country, district, region, motto, trial_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '30 days')
       RETURNING *`,
      [
        data.school_name,
        data.school_email || null,
        data.school_phone || null,
        data.school_address || null,
        data.country || null,
        data.district || null,
        data.region || null,
        data.motto || null,
      ]
    );
    const school = schoolResult.rows[0];

    // 2. Create default branding
    await client.query(
      `INSERT INTO school_branding (school_id) VALUES ($1)`,
      [school.id]
    );

    // 3. Create admin user
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const userResult = await client.query(
      `INSERT INTO users (school_id, first_name, last_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, 'SCHOOL_ADMIN')
       RETURNING id, school_id, first_name, last_name, email, phone, role, created_at`,
      [
        school.id,
        data.first_name,
        data.last_name,
        data.email,
        data.phone || null,
        passwordHash,
      ]
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');

    // Generate tokens
    const accessToken = generateAccessToken({ ...user, school_id: school.id });
    const refreshToken = generateRefreshToken(user);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
    await authModel.storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        school_id: school.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        avatar_url: null,
        school_name: school.name,
        school_badge_url: school.badge_url || null,
        plan_type: school.plan_type || 'starter',
        subscription_status: school.subscription_status || 'trial',
        trial_ends_at: school.trial_ends_at || null,
        subscription_expires_at: school.subscription_expires_at || null,
        primary_color: null,
        secondary_color: null,
        font_family: null,
        font_style: null,
      },
      school: {
        id: school.id,
        name: school.name,
        subscription_status: school.subscription_status,
        plan_type: school.plan_type,
        trial_ends_at: school.trial_ends_at,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (token) => {
  const record = await authModel.findRefreshToken(token);

  if (!record) {
    const err = new Error('Invalid or expired refresh token.');
    err.statusCode = 401;
    throw err;
  }

  if (!record.is_active) {
    const err = new Error('User account is deactivated.');
    err.statusCode = 403;
    throw err;
  }

  // Delete old token and issue a new pair (token rotation)
  await authModel.deleteRefreshToken(token);

  const user = {
    id: record.user_id,
    school_id: record.school_id,
    role: record.role,
    email: record.email,
  };

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
  await authModel.storeRefreshToken(user.id, newRefreshToken, refreshExpiresAt);

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
  };
};

/**
 * Change password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await authModel.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  // Need to get password hash
  const fullUser = await db.query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  const isMatch = await bcrypt.compare(currentPassword, fullUser.rows[0].password_hash);

  if (!isMatch) {
    const err = new Error('Current password is incorrect.');
    err.statusCode = 400;
    throw err;
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await authModel.updatePassword(userId, newHash);

  // Revoke all refresh tokens (force re-login everywhere)
  await authModel.deleteAllUserTokens(userId);

  return { message: 'Password changed successfully. Please log in again.' };
};

/**
 * Logout – revoke refresh token
 */
const logout = async (refreshToken) => {
  if (refreshToken) {
    await authModel.deleteRefreshToken(refreshToken);
  }
};

module.exports = {
  login,
  registerSchool,
  refreshAccessToken,
  changePassword,
  logout,
};

