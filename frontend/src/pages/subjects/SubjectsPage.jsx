import { useEffect, useState, useCallback } from 'react';
import useApi from '../../hooks/useApi';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX,
  HiOutlineLink, HiOutlineUserAdd,
} from 'react-icons/hi';

const emptySubjectForm = { name: '', code: '', description: '' };
const emptyAssignForm = { teacher_id: '', subject_id: '', class_id: '' };

const SubjectsPage = () => {
  const { get, post, put, del, loading } = useApi();

  // Data
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Subject form
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ ...emptySubjectForm });

  // Assignment form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ ...emptyAssignForm });

  // Active tab
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' | 'assignments'

  /* ─── Fetch data ─── */
  const fetchAll = useCallback(async () => {
    try {
      const [subRes, teachRes, classRes, assignRes] = await Promise.all([
        get('/subjects', null, { silent: true }),
        get('/teachers', { limit: 200 }, { silent: true }),
        get('/classes', null, { silent: true }),
        get('/subjects/assignments/list', null, { silent: true }),
      ]);
      setSubjects(subRes.data || []);
      setTeachers(teachRes.data || []);
      setClasses(classRes.data || []);
      setAssignments(assignRes.data || []);
    } catch { /* handled */ }
  }, [get]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Subject CRUD ─── */
  const resetSubjectForm = () => { setSubjectForm({ ...emptySubjectForm }); setEditSubjectId(null); };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editSubjectId) {
        await put(`/subjects/${editSubjectId}`, subjectForm);
        toast.success('Subject updated');
      } else {
        await post('/subjects', subjectForm);
        toast.success('Subject created');
      }
      setShowSubjectForm(false);
      resetSubjectForm();
      fetchAll();
    } catch { /* handled */ }
  };

  const handleEditSubject = (s) => {
    setEditSubjectId(s.id);
    setSubjectForm({ name: s.name, code: s.code || '', description: s.description || '' });
    setShowSubjectForm(true);
    setActiveTab('subjects');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Delete subject "${name}"? Existing assignments will also be removed.`)) return;
    try {
      await del(`/subjects/${id}`);
      toast.success('Subject deleted');
      fetchAll();
    } catch { /* handled */ }
  };

  /* ─── Teacher Assignment ─── */
  const resetAssignForm = () => setAssignForm({ ...emptyAssignForm });

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...assignForm };
      if (!payload.class_id) payload.class_id = null;
      await post('/subjects/assignments', payload);
      toast.success('Teacher assigned to subject');
      setShowAssignForm(false);
      resetAssignForm();
      fetchAll();
    } catch { /* handled */ }
  };

  const handleUnassign = async (assignmentId) => {
    if (!window.confirm('Remove this teacher-subject assignment?')) return;
    try {
      await del(`/subjects/assignments/${assignmentId}`);
      toast.success('Assignment removed');
      fetchAll();
    } catch { /* handled */ }
  };

  /* ─── Helpers ─── */
  // Group assignments by subject
  const assignmentsBySubject = {};
  assignments.forEach((a) => {
    if (!assignmentsBySubject[a.subject_id]) assignmentsBySubject[a.subject_id] = [];
    assignmentsBySubject[a.subject_id].push(a);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
        <div className="flex gap-2 self-start">
          <button
            onClick={() => { setShowAssignForm(!showAssignForm); setShowSubjectForm(false); resetAssignForm(); }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <HiOutlineLink className="w-4 h-4" /> Assign Teacher
          </button>
          <button
            onClick={() => { setShowSubjectForm(!showSubjectForm); setShowAssignForm(false); resetSubjectForm(); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <HiOutlinePlus className="w-5 h-5" /> Add Subject
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'subjects' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All Subjects ({subjects.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'assignments' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Assignments ({assignments.length})
        </button>
      </div>

      {/* ─── Subject Form ─── */}
      {showSubjectForm && (
        <form onSubmit={handleSubjectSubmit} className="card space-y-4 border-primary-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{editSubjectId ? 'Edit Subject' : 'New Subject'}</h3>
            <button type="button" onClick={() => { setShowSubjectForm(false); resetSubjectForm(); }} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Subject Name *</label>
              <input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} className="input-field" required placeholder="e.g. Mathematics" />
            </div>
            <div>
              <label className="label">Subject Code</label>
              <input value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} className="input-field" placeholder="e.g. MATH" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="label">Description</label>
              <input value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} className="input-field" placeholder="Brief description" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowSubjectForm(false); resetSubjectForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : editSubjectId ? 'Update Subject' : 'Create Subject'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Assignment Form ─── */}
      {showAssignForm && (
        <form onSubmit={handleAssignSubmit} className="card space-y-4 border-accent-200 bg-accent-50/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Assign Teacher to Subject</h3>
            <button type="button" onClick={() => { setShowAssignForm(false); resetAssignForm(); }} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Teacher *</label>
              <select value={assignForm.teacher_id} onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })} className="input-field" required>
                <option value="">Select teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}{t.employee_number ? ` (${t.employee_number})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select value={assignForm.subject_id} onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })} className="input-field" required>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Class (optional)</label>
              <select value={assignForm.class_id} onChange={(e) => setAssignForm({ ...assignForm, class_id: e.target.value })} className="input-field">
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400">If no class is selected, the teacher is assigned to this subject across all classes.</p>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowAssignForm(false); resetAssignForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-accent">
              {loading ? 'Assigning...' : 'Assign Teacher'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Subjects Tab ─── */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => {
            const subAssigns = assignmentsBySubject[s.id] || [];
            return (
              <div key={s.id} className="card flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{s.name}</h3>
                      {s.code && <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 font-medium">{s.code}</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditSubject(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-500 transition" title="Edit">
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteSubject(s.id, s.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Delete">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {s.description && <p className="text-sm text-gray-500 mt-2">{s.description}</p>}

                  {/* Assigned teachers */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      Assigned Teachers ({subAssigns.length})
                    </p>
                    {subAssigns.length > 0 ? (
                      <div className="space-y-1.5">
                        {subAssigns.map((a) => (
                          <div key={a.assignment_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">{a.first_name} {a.last_name}</span>
                              {a.class_name && (
                                <span className="ml-2 text-xs bg-primary-100 text-primary-600 rounded px-1.5 py-0.5">{a.class_name}</span>
                              )}
                              {!a.class_name && (
                                <span className="ml-2 text-xs bg-gray-200 text-gray-500 rounded px-1.5 py-0.5">All classes</span>
                              )}
                            </div>
                            <button onClick={() => handleUnassign(a.assignment_id)} className="text-gray-400 hover:text-red-500 transition" title="Remove">
                              <HiOutlineX className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No teachers assigned</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {subjects.length === 0 && (
            <div className="col-span-full card text-center py-12 text-gray-400">
              <p>No subjects yet. Click "Add Subject" to create one.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Assignments Tab ─── */}
      {activeTab === 'assignments' && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">All Teacher-Subject Assignments</h3>
          {assignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left p-3">Teacher</th>
                    <th className="text-left p-3">Subject</th>
                    <th className="text-left p-3">Class</th>
                    <th className="text-center p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.assignment_id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-xs">
                            {a.teacher_first_name[0]}{a.teacher_last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{a.teacher_first_name} {a.teacher_last_name}</p>
                            {a.employee_number && <p className="text-xs text-gray-400">{a.employee_number}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-gray-700">{a.subject_name}</span>
                        {a.subject_code && <span className="ml-2 text-xs text-gray-400">({a.subject_code})</span>}
                      </td>
                      <td className="p-3">
                        {a.class_name ? (
                          <span className="px-2 py-1 bg-primary-100 text-primary-600 rounded text-xs font-medium">{a.class_name}</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">All classes</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleUnassign(a.assignment_id)} className="text-red-400 hover:text-red-600 transition" title="Remove assignment">
                          <HiOutlineTrash className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <HiOutlineUserAdd className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No teacher-subject assignments yet.</p>
              <p className="text-sm mt-1">Click "Assign Teacher" to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;

