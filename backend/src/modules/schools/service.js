const schoolModel = require('./model');
const db = require('../../config/db');
const { getLimits } = require('../../config/planLimits');

const getSchool = async (schoolId) => {
  const school = await schoolModel.findById(schoolId);
  if (!school) {
    const err = new Error('School not found.');
    err.statusCode = 404;
    throw err;
  }
  return school;
};

const listSchools = async (query) => {
  return schoolModel.findAll(query);
};

const updateSchool = async (schoolId, data) => {
  return schoolModel.update(schoolId, data);
};

const updateBranding = async (schoolId, data) => {
  return schoolModel.updateBranding(schoolId, data);
};

/**
 * Return plan limits + current usage counts for a school.
 */
const getPlanUsage = async (schoolId) => {
  // Get school's plan
  const schoolRes = await db.query(
    'SELECT plan_type, subscription_status, trial_ends_at, subscription_expires_at FROM schools WHERE id = $1',
    [schoolId]
  );
  if (schoolRes.rows.length === 0) {
    const err = new Error('School not found.');
    err.statusCode = 404;
    throw err;
  }

  const school = schoolRes.rows[0];
  const limits = getLimits(school.plan_type);

  // Count current records
  const countsRes = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM pupils   WHERE school_id = $1 AND is_active = true) as pupils,
       (SELECT COUNT(*)::int FROM teachers WHERE school_id = $1 AND is_active = true) as teachers,
       (SELECT COUNT(*)::int FROM classes  WHERE school_id = $1 AND is_active = true) as classes,
       (SELECT COUNT(*)::int FROM parents  WHERE school_id = $1) as parents`,
    [schoolId]
  );

  return {
    plan_type: school.plan_type,
    subscription_status: school.subscription_status,
    trial_ends_at: school.trial_ends_at,
    subscription_expires_at: school.subscription_expires_at,
    limits,
    usage: countsRes.rows[0],
  };
};

module.exports = { getSchool, listSchools, updateSchool, updateBranding, getPlanUsage };

