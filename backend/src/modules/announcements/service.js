const model = require('./model');

const createAnnouncement = async (schoolId, data, userId) =>
  model.create({ ...data, school_id: schoolId, posted_by: userId });

const listAnnouncements = async (schoolId, query) => model.findBySchool(schoolId, query);

const getAnnouncement = async (id, schoolId) => {
  const item = await model.findById(id, schoolId);
  if (!item) { const err = new Error('Announcement not found.'); err.statusCode = 404; throw err; }
  return item;
};

const updateAnnouncement = async (id, schoolId, data) => model.update(id, schoolId, data);

module.exports = { createAnnouncement, listAnnouncements, getAnnouncement, updateAnnouncement };

