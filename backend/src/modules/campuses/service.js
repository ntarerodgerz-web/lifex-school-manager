const campusModel = require('./model');

const create = async (schoolId, data) => {
  return campusModel.create({ ...data, school_id: schoolId });
};

const list = async (schoolId) => {
  return campusModel.findBySchool(schoolId);
};

const getById = async (id, schoolId) => {
  const campus = await campusModel.findById(id, schoolId);
  if (!campus) {
    const err = new Error('Campus not found');
    err.statusCode = 404;
    throw err;
  }
  return campus;
};

const update = async (id, schoolId, data) => {
  const campus = await campusModel.update(id, schoolId, data);
  if (!campus) {
    const err = new Error('Campus not found');
    err.statusCode = 404;
    throw err;
  }
  return campus;
};

const remove = async (id, schoolId) => {
  const campus = await campusModel.remove(id, schoolId);
  if (!campus) {
    const err = new Error('Campus not found');
    err.statusCode = 404;
    throw err;
  }
  return campus;
};

module.exports = { create, list, getById, update, remove };

