const attendanceService = require('./service');
const { success } = require('../../utils/response');

const record = async (req, res, next) => {
  try {
    const result = await attendanceService.recordAttendance(req.schoolId, req.body, req.user.id);
    return success(res, { statusCode: 201, message: 'Attendance recorded', data: result });
  } catch (err) { next(err); }
};

const bulkRecord = async (req, res, next) => {
  try {
    const result = await attendanceService.bulkRecordAttendance(req.schoolId, req.body, req.user.id);
    return success(res, { statusCode: 201, message: 'Attendance saved', data: result });
  } catch (err) { next(err); }
};

const getByClass = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const data = await attendanceService.getClassAttendance(req.schoolId, req.params.classId, date);
    return success(res, { data });
  } catch (err) { next(err); }
};

const getByPupil = async (req, res, next) => {
  try {
    const data = await attendanceService.getPupilAttendance(req.schoolId, req.params.pupilId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const dailySummary = async (req, res, next) => {
  try {
    const data = await attendanceService.getDailySummary(req.schoolId, req.query.date);
    return success(res, { data });
  } catch (err) { next(err); }
};

module.exports = { record, bulkRecord, getByClass, getByPupil, dailySummary };

