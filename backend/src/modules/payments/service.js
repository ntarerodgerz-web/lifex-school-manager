const paymentModel = require('./model');

const createPayment = async (schoolId, data, userId) => {
  return paymentModel.create({ ...data, school_id: schoolId, received_by: userId });
};

const listPayments = async (schoolId, query) => {
  return paymentModel.findBySchool(schoolId, query);
};

const getPupilBalance = async (schoolId, pupilId) => {
  return paymentModel.getPupilBalance(schoolId, pupilId);
};

module.exports = { createPayment, listPayments, getPupilBalance };

