const authService = require('./service');
const { success } = require('../../utils/response');

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    return success(res, {
      statusCode: 200,
      message: 'Login successful',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/register
 * Self-signup: creates a school + admin user
 */
const register = async (req, res, next) => {
  try {
    const data = await authService.registerSchool(req.body);
    return success(res, {
      statusCode: 201,
      message: 'School registered successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const data = await authService.refreshAccessToken(req.body.refresh_token);
    return success(res, {
      statusCode: 200,
      message: 'Token refreshed',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const data = await authService.changePassword(
      req.user.id,
      req.body.current_password,
      req.body.new_password
    );
    return success(res, { message: data.message });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refresh_token);
    return success(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const authModel = require('./model');
    const user = await authModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return success(res, { data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, refresh, changePassword, logout, getMe };

