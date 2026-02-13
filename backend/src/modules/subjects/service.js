const model = require('./model');

const createSubject = async (schoolId, data) => model.create({ ...data, school_id: schoolId });

const listSubjects = async (schoolId) => model.findBySchool(schoolId);

const getSubject = async (id, schoolId) => {
  const s = await model.findById(id, schoolId);
  if (!s) { const err = new Error('Subject not found.'); err.statusCode = 404; throw err; }
  s.assignments = await model.getAssignmentsForSubject(id, schoolId);
  return s;
};

const updateSubject = async (id, schoolId, data) => {
  const existing = await model.findById(id, schoolId);
  if (!existing) { const err = new Error('Subject not found.'); err.statusCode = 404; throw err; }
  return model.update(id, schoolId, data);
};

const deleteSubject = async (id, schoolId) => {
  const existing = await model.findById(id, schoolId);
  if (!existing) { const err = new Error('Subject not found.'); err.statusCode = 404; throw err; }
  return model.remove(id, schoolId);
};

/* ─── Teacher-Subject Assignments ─── */

const assignTeacher = async (schoolId, body) => {
  const { teacher_id, subject_id, class_id } = body;
  // Validate subject exists
  const subject = await model.findById(subject_id, schoolId);
  if (!subject) { const err = new Error('Subject not found.'); err.statusCode = 404; throw err; }

  const result = await model.assignTeacher(schoolId, teacher_id, subject_id, class_id);
  if (!result) {
    const err = new Error('This assignment already exists.');
    err.statusCode = 409;
    throw err;
  }
  return result;
};

const unassignTeacher = async (assignmentId, schoolId) => {
  const result = await model.unassignTeacher(assignmentId, schoolId);
  if (!result) { const err = new Error('Assignment not found.'); err.statusCode = 404; throw err; }
  return result;
};

const getAssignments = async (schoolId, query = {}) => {
  if (query.teacher_id) return model.getAssignmentsForTeacher(query.teacher_id, schoolId);
  if (query.class_id) return model.getSubjectsForClass(query.class_id, schoolId);
  if (query.subject_id) return model.getAssignmentsForSubject(query.subject_id, schoolId);
  return model.getAllAssignments(schoolId);
};

module.exports = {
  createSubject, listSubjects, getSubject, updateSubject, deleteSubject,
  assignTeacher, unassignTeacher, getAssignments,
};
