const campusService = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const campus = await campusService.create(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'Campus created', data: campus });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const data = await campusService.list(req.schoolId);
    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

const get = async (req, res, next) => {
  try {
    const data = await campusService.getById(req.params.id, req.schoolId);
    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await campusService.update(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Campus updated', data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await campusService.remove(req.params.id, req.schoolId);
    return success(res, { message: 'Campus removed' });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, list, get, update, remove };

