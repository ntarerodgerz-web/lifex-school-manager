const svc = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const item = await svc.createBroadcast(req.body, req.user.id);
    return success(res, { statusCode: 201, message: 'Broadcast sent', data: item });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const data = await svc.listBroadcasts(req.user.role, req.user.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    return success(res, { data: await svc.getBroadcast(req.params.id) });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await svc.deleteBroadcast(req.params.id);
    return success(res, { message: 'Broadcast removed' });
  } catch (err) { next(err); }
};

module.exports = { create, list, get, remove };

