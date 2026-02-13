const reportService = require('./service');
const { success } = require('../../utils/response');

const schoolSummary = async (req, res, next) => {
  try {
    const data = await reportService.schoolSummary(req.schoolId);
    return success(res, { data });
  } catch (err) { next(err); }
};

const attendanceReport = async (req, res, next) => {
  try {
    const data = await reportService.attendanceReport(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const financialReport = async (req, res, next) => {
  try {
    const data = await reportService.financialReport(req.schoolId, req.query);
    return success(res, { data });
  } catch (err) { next(err); }
};

const enrollmentReport = async (req, res, next) => {
  try {
    const data = await reportService.enrollmentReport(req.schoolId);
    return success(res, { data });
  } catch (err) { next(err); }
};

const teacherSummaryReport = async (req, res, next) => {
  try {
    const data = await reportService.teacherSummaryReport(req.schoolId);
    return success(res, { data });
  } catch (err) { next(err); }
};

const schoolProfileReport = async (req, res, next) => {
  try {
    const data = await reportService.schoolProfileReport(req.schoolId);
    return success(res, { data });
  } catch (err) { next(err); }
};

module.exports = { schoolSummary, attendanceReport, financialReport, enrollmentReport, teacherSummaryReport, schoolProfileReport };

