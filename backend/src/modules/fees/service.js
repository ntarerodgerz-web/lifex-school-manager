const feeModel = require('./model');

const createFee = async (schoolId, data) => feeModel.create({ ...data, school_id: schoolId });
const listFees = async (schoolId, query) => feeModel.findBySchool(schoolId, query);
const getFee = async (id, schoolId) => {
  const fee = await feeModel.findById(id, schoolId);
  if (!fee) { const err = new Error('Fee not found.'); err.statusCode = 404; throw err; }
  return fee;
};
const updateFee = async (id, schoolId, data) => feeModel.update(id, schoolId, data);

module.exports = { createFee, listFees, getFee, updateFee };

