const model = require('./model');

const createSubscription = async (data) => {
  const sub = await model.create(data);
  // Activate on school record
  await model.activate(data.school_id, data.plan_type, data.expires_at);
  return sub;
};

const listSubscriptions = async (schoolId) => model.findBySchool(schoolId);
const getActiveSubscription = async (schoolId) => model.getActive(schoolId);

module.exports = { createSubscription, listSubscriptions, getActiveSubscription };

