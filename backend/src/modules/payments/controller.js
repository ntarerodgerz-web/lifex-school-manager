const paymentService = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment(req.schoolId, req.body, req.user.id);
    return success(res, { statusCode: 201, message: 'Payment recorded', data: payment });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    return success(res, { data: await paymentService.listPayments(req.schoolId, req.query) });
  } catch (err) { next(err); }
};

const balance = async (req, res, next) => {
  try {
    const data = await paymentService.getPupilBalance(req.schoolId, req.params.pupilId);
    return success(res, { data });
  } catch (err) { next(err); }
};

module.exports = { create, list, balance };

