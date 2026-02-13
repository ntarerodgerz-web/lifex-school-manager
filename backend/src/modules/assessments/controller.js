const svc = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const assessment = await svc.createAssessment(req.schoolId, req.body, req.user.id);
    return success(res, { statusCode: 201, message: 'Assessment recorded', data: assessment });
  } catch (err) { next(err); }
};

const bulkCreate = async (req, res, next) => {
  try {
    const results = await svc.bulkCreateAssessments(req.schoolId, req.body.assessments, req.user.id);
    return success(res, { statusCode: 201, message: `${results.length} assessments recorded`, data: results });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const data = await svc.listAssessments(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const data = await svc.getAssessment(req.params.id, req.schoolId);
    return success(res, { data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await svc.updateAssessment(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Assessment updated', data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await svc.deleteAssessment(req.params.id, req.schoolId);
    return success(res, { message: 'Assessment deleted' });
  } catch (err) { next(err); }
};

const pupilReport = async (req, res, next) => {
  try {
    const data = await svc.getPupilReport(req.schoolId, req.params.pupilId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

module.exports = { create, bulkCreate, list, get, update, remove, pupilReport };

