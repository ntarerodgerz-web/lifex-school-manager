const svc = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const sub = await svc.createSubscription(req.body);
    return success(res, { statusCode: 201, message: 'Subscription created', data: sub });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    return success(res, { data: await svc.listSubscriptions(req.schoolId || req.query.school_id) });
  } catch (err) { next(err); }
};

const active = async (req, res, next) => {
  try {
    const sub = await svc.getActiveSubscription(req.schoolId || req.query.school_id);
    return success(res, { data: sub });
  } catch (err) { next(err); }
};

module.exports = { create, list, active };

