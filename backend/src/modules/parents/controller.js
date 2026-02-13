const parentService = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const parent = await parentService.createParent(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'Parent added', data: parent });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const data = await parentService.listParents(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const parent = await parentService.getParent(req.params.id, req.schoolId);
    return success(res, { data: parent });
  } catch (err) { next(err); }
};

/** Parent portal: get my children */
const myChildren = async (req, res, next) => {
  try {
    const children = await parentService.getMyChildren(req.user.id, req.schoolId);
    return success(res, { data: children });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const parent = await parentService.updateParent(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Parent updated', data: parent });
  } catch (err) { next(err); }
};

const linkChild = async (req, res, next) => {
  try {
    const result = await parentService.linkChild(req.schoolId, req.params.id, req.body.pupil_id, req.body.is_primary);
    return success(res, { message: 'Child linked', data: result });
  } catch (err) { next(err); }
};

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo file provided.' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const parent = await parentService.getParent(req.params.id, req.schoolId);
    const db = require('../../config/db');
    await db.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, parent.user_id]);
    return success(res, { message: 'Parent photo updated', data: { avatar_url: avatarUrl } });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await parentService.deleteParent(req.params.id, req.schoolId);
    return success(res, { message: 'Parent removed' });
  } catch (err) { next(err); }
};

module.exports = { create, list, get, myChildren, update, linkChild, uploadPhoto, remove };

