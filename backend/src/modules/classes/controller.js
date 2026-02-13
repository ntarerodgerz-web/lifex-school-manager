const classService = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const cls = await classService.createClass(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'Class created', data: cls });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const data = await classService.listClasses(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const cls = await classService.getClass(req.params.id, req.schoolId);
    return success(res, { data: cls });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const cls = await classService.updateClass(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Class updated', data: cls });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await classService.deleteClass(req.params.id, req.schoolId);
    return success(res, { message: 'Class deleted' });
  } catch (err) { next(err); }
};

module.exports = { create, list, get, update, remove };

