const pupilService = require('./service');
const { success } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const pupil = await pupilService.createPupil(req.schoolId, req.body);
    return success(res, { statusCode: 201, message: 'Pupil enrolled', data: pupil });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const data = await pupilService.listPupils(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const pupil = await pupilService.getPupil(req.params.id, req.schoolId);
    return success(res, { data: pupil });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const pupil = await pupilService.updatePupil(req.params.id, req.schoolId, req.body);
    return success(res, { message: 'Pupil updated', data: pupil });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await pupilService.deletePupil(req.params.id, req.schoolId);
    return success(res, { message: 'Pupil removed' });
  } catch (err) { next(err); }
};

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo file provided.' });
    }
    const photoUrl = `/uploads/photos/${req.file.filename}`;
    const pupil = await pupilService.updatePupil(req.params.id, req.schoolId, { photo_url: photoUrl });
    return success(res, { message: 'Pupil photo updated', data: { photo_url: pupil.photo_url } });
  } catch (err) { next(err); }
};

module.exports = { create, list, get, update, remove, uploadPhoto };

