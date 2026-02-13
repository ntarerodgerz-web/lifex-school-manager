const pupilModel = require('./model');
const db = require('../../config/db');

const createPupil = async (schoolId, data) => {
  const pupil = await pupilModel.create({ ...data, school_id: schoolId });

  // Link parent if provided
  if (data.parent_id) {
    await db.query(
      `INSERT INTO pupil_parents (school_id, pupil_id, parent_id, is_primary)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (pupil_id, parent_id) DO NOTHING`,
      [schoolId, pupil.id, data.parent_id]
    );
  }

  return pupil;
};

const listPupils = async (schoolId, query) => {
  return pupilModel.findBySchool(schoolId, query);
};

const getPupil = async (id, schoolId) => {
  const pupil = await pupilModel.findById(id, schoolId);
  if (!pupil) {
    const err = new Error('Pupil not found.');
    err.statusCode = 404;
    throw err;
  }
  // Attach parents
  pupil.parents = await pupilModel.getParents(id, schoolId);
  return pupil;
};

const updatePupil = async (id, schoolId, data) => {
  return pupilModel.update(id, schoolId, data);
};

const deletePupil = async (id, schoolId) => {
  return pupilModel.remove(id, schoolId);
};

module.exports = { createPupil, listPupils, getPupil, updatePupil, deletePupil };

