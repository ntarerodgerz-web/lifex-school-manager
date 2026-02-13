const bcrypt = require('bcrypt');
const userModel = require('./model');

const SALT_ROUNDS = 12;

const createUser = async (schoolId, data) => {
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  return userModel.create({
    school_id: schoolId,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    password_hash: passwordHash,
    role: data.role,
    avatar_url: data.avatar_url,
  });
};

const listUsers = async (schoolId, query) => {
  return userModel.findBySchool(schoolId, query);
};

const getUser = async (id, schoolId) => {
  const user = await userModel.findById(id, schoolId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

const updateUser = async (id, schoolId, data) => {
  return userModel.update(id, schoolId, data);
};

const deactivateUser = async (id, schoolId) => {
  return userModel.deactivate(id, schoolId);
};

module.exports = { createUser, listUsers, getUser, updateUser, deactivateUser };

