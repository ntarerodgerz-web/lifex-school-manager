const schoolService = require('./service');
const { success } = require('../../utils/response');

const getSchool = async (req, res, next) => {
  try {
    const school = await schoolService.getSchool(req.schoolId);
    return success(res, { data: school });
  } catch (err) {
    next(err);
  }
};

const listSchools = async (req, res, next) => {
  try {
    const data = await schoolService.listSchools(req.query);
    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

const updateSchool = async (req, res, next) => {
  try {
    const school = await schoolService.updateSchool(req.schoolId, req.body);
    return success(res, { message: 'School updated', data: school });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload school badge image
 */
const uploadBadge = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No image file provided.');
      err.statusCode = 400;
      throw err;
    }

    const badgeUrl = `/uploads/badges/${req.file.filename}`;
    const school = await schoolService.updateSchool(req.schoolId, { badge_url: badgeUrl });
    return success(res, { message: 'School badge uploaded', data: school });
  } catch (err) {
    next(err);
  }
};

const updateBranding = async (req, res, next) => {
  try {
    const branding = await schoolService.updateBranding(req.schoolId, req.body);
    return success(res, { message: 'Branding updated', data: branding });
  } catch (err) {
    next(err);
  }
};

/**
 * SUPER_ADMIN: update any school by ID
 */
const updateSchoolById = async (req, res, next) => {
  try {
    const school = await schoolService.updateSchool(req.params.id, req.body);
    return success(res, { message: 'School updated', data: school });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /schools/me/plan-usage — plan limits + current counts
 */
const getPlanUsage = async (req, res, next) => {
  try {
    const data = await schoolService.getPlanUsage(req.schoolId);
    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSchool, listSchools, updateSchool, updateSchoolById, uploadBadge, updateBranding, getPlanUsage };

