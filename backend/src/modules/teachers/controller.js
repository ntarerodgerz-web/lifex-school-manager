const teacherService = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const teacher = await teacherService.createTeacher(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'Teacher added', data: teacher });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const data = await teacherService.listTeachers(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacher(req.params.id, req.schoolId);
    return success(res, { data: teacher });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const teacher = await teacherService.updateTeacher(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Teacher updated', data: teacher });
  } catch (err) { next(err); }
};

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo file provided.' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    // Get teacher to find user_id
    const teacher = await teacherService.getTeacher(req.params.id, req.schoolId);
    const db = require('../../config/db');
    await db.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, teacher.user_id]);
    return success(res, { message: 'Teacher photo updated', data: { avatar_url: avatarUrl } });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await teacherService.deleteTeacher(req.params.id, req.schoolId);
    return success(res, { message: 'Teacher removed' });
  } catch (err) { next(err); }
};

module.exports = { create, list, get, update, uploadPhoto, remove };

