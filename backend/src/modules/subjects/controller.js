const svc = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const item = await svc.createSubject(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'Subject created', data: item });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try { return success(res, { data: await svc.listSubjects(req.schoolId) }); }
  catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try { return success(res, { data: await svc.getSubject(req.params.id, req.schoolId) }); }
  catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const item = await svc.updateSubject(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Subject updated', data: item });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await svc.deleteSubject(req.params.id, req.schoolId);
    return success(res, { message: 'Subject deleted' });
  } catch (err) { next(err); }
};

/* ─── Teacher-Subject Assignments ─── */

const assign = async (req, res, next) => {
  try {
    const result = await svc.assignTeacher(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'Teacher assigned to subject', data: result });
  } catch (err) { next(err); }
};

const unassign = async (req, res, next) => {
  try {
    await svc.unassignTeacher(req.params.assignmentId, req.schoolId);
    return success(res, { message: 'Assignment removed' });
  } catch (err) { next(err); }
};

const listAssignments = async (req, res, next) => {
  try {
    const data = await svc.getAssignments(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

module.exports = { create, list, get, update, remove, assign, unassign, listAssignments };
