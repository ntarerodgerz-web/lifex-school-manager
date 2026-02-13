const attendanceModel = require('./model');

const recordAttendance = async (schoolId, data, userId) => {
  return attendanceModel.record({
    school_id: schoolId,
    pupil_id: data.pupil_id,
    class_id: data.class_id,
    date: data.date,
    status: data.status,
    recorded_by: userId,
    notes: data.notes,
  });
};

const bulkRecordAttendance = async (schoolId, data, userId) => {
  const records = data.records.map((r) => ({
    ...r,
    class_id: data.class_id,
    date: data.date,
  }));
  return attendanceModel.bulkRecord(schoolId, records, userId);
};

const getClassAttendance = async (schoolId, classId, date) => {
  return attendanceModel.findByClassDate(schoolId, classId, date);
};

const getPupilAttendance = async (schoolId, pupilId, filters) => {
  return attendanceModel.findByPupil(schoolId, pupilId, filters);
};

const getDailySummary = async (schoolId, date) => {
  return attendanceModel.dailySummary(schoolId, date || new Date().toISOString().slice(0, 10));
};

module.exports = {
  recordAttendance,
  bulkRecordAttendance,
  getClassAttendance,
  getPupilAttendance,
  getDailySummary,
};

