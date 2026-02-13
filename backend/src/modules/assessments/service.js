const model = require('./model');
const db = require('../../config/db');

const createAssessment = async (schoolId, data, userId) => {
  return model.create({ ...data, school_id: schoolId, recorded_by: userId });
};

const bulkCreateAssessments = async (schoolId, records, userId) => {
  return model.bulkCreate(schoolId, records, userId);
};

const listAssessments = async (schoolId, query) => {
  return model.findBySchool(schoolId, query);
};

const getAssessment = async (id, schoolId) => {
  const assessment = await model.findById(id, schoolId);
  if (!assessment) {
    const err = new Error('Assessment not found.');
    err.statusCode = 404;
    throw err;
  }
  return assessment;
};

const updateAssessment = async (id, schoolId, data) => {
  const assessment = await model.findById(id, schoolId);
  if (!assessment) {
    const err = new Error('Assessment not found.');
    err.statusCode = 404;
    throw err;
  }
  return model.update(id, schoolId, data);
};

const deleteAssessment = async (id, schoolId) => {
  const result = await model.remove(id, schoolId);
  if (!result) {
    const err = new Error('Assessment not found.');
    err.statusCode = 404;
    throw err;
  }
  return result;
};

/**
 * Get a pupil's full report card with pupil info
 */
const getPupilReport = async (schoolId, pupilId, query) => {
  // Get pupil info
  const pupilRes = await db.query(
    `SELECT p.*, c.name as class_name
     FROM pupils p
     LEFT JOIN classes c ON p.class_id = c.id
     WHERE p.id = $1 AND p.school_id = $2`,
    [pupilId, schoolId]
  );

  if (pupilRes.rows.length === 0) {
    const err = new Error('Pupil not found.');
    err.statusCode = 404;
    throw err;
  }

  const pupil = pupilRes.rows[0];
  const assessments = await model.getPupilReport(schoolId, pupilId, query);

  // Compute aggregate
  const totalScore = assessments.reduce((sum, a) => sum + (parseFloat(a.score) || 0), 0);
  const avgScore = assessments.length > 0 ? (totalScore / assessments.length).toFixed(1) : 0;

  return {
    pupil,
    assessments,
    summary: {
      total_subjects: assessments.length,
      total_score: totalScore,
      average_score: parseFloat(avgScore),
    },
  };
};

module.exports = {
  createAssessment,
  bulkCreateAssessments,
  listAssessments,
  getAssessment,
  updateAssessment,
  deleteAssessment,
  getPupilReport,
};

