const feeService = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const fee = await feeService.createFee(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'Fee created', data: fee });
  } catch (err) { next(err); }
};
const list = async (req, res, next) => {
  try { return success(res, { data: await feeService.listFees(req.schoolId, req.query) }); } catch (err) { next(err); }
};
const get = async (req, res, next) => {
  try { return success(res, { data: await feeService.getFee(req.params.id, req.schoolId) }); } catch (err) { next(err); }
};
const update = async (req, res, next) => {
  try {
    const fee = await feeService.updateFee(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Fee updated', data: fee });
  } catch (err) { next(err); }
};

module.exports = { create, list, get, update };

