const svc = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const item = await svc.createAnnouncement(req.schoolId, req.body, req.user.id);
    return success(res, { statusCode: 201, message: 'Announcement created', data: item });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try { return success(res, { data: await svc.listAnnouncements(req.schoolId, req.query) }); } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try { return success(res, { data: await svc.getAnnouncement(req.params.id, req.schoolId) }); } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const item = await svc.updateAnnouncement(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Announcement updated', data: item });
  } catch (err) { next(err); }
};

module.exports = { create, list, get, update };

