const classModel = require('./model');

const createClass = async (schoolId, data) => {
  return classModel.create({ ...data, school_id: schoolId });
};

const listClasses = async (schoolId, query) => {
  return classModel.findBySchool(schoolId, query);
};

const getClass = async (id, schoolId) => {
  const cls = await classModel.findById(id, schoolId);
  if (!cls) {
    const err = new Error('Class not found.');
    err.statusCode = 404;
    throw err;
  }
  return cls;
};

const updateClass = async (id, schoolId, data) => {
  return classModel.update(id, schoolId, data);
};

const deleteClass = async (id, schoolId) => {
  return classModel.remove(id, schoolId);
};

module.exports = { createClass, listClasses, getClass, updateClass, deleteClass };

