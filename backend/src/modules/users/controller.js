const userService = require('./service');
const { success } = require('../../utils/response');

const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'User created', data: user });
  } catch (err) {
    next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const data = await userService.listUsers(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.id, req.schoolId);
    return success(res, { data: user });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'User updated', data: user });
  } catch (err) {
    next(err);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    const result = await userService.deactivateUser(req.params.id, req.schoolId);
    return success(res, { message: 'User deactivated', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload avatar for the currently authenticated user
 */
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No image file provided.');
      err.statusCode = 400;
      throw err;
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await userService.updateUser(req.user.id, req.schoolId, { avatar_url: avatarUrl });
    return success(res, { message: 'Avatar uploaded', data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, listUsers, getUser, updateUser, deactivateUser, uploadAvatar };

