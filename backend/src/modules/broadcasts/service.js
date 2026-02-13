const model = require('./model');

const createBroadcast = async (data, userId) =>
  model.create({ ...data, posted_by: userId });

const listBroadcasts = async (userRole, schoolId, query) =>
  model.findForUser(userRole, schoolId, query);

const getBroadcast = async (id) => {
  const item = await model.findById(id);
  if (!item) {
    const err = new Error('Broadcast not found.');
    err.statusCode = 404;
    throw err;
  }
  return item;
};

const deleteBroadcast = async (id) => model.remove(id);

module.exports = { createBroadcast, listBroadcasts, getBroadcast, deleteBroadcast };

