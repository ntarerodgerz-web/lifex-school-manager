import { useEffect, useState, useCallback } from 'react';
import useApi from '../../hooks/useApi';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

const ClassesPage = () => {
  const { get, post, put, del, loading } = useApi();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', section: '', capacity: 40, academic_year: '', teacher_id: '' });

  const fetchAll = useCallback(async () => {
    try {
      const [classRes, teachRes, assignRes] = await Promise.all([
        get('/classes', null, { silent: true }),
        get('/teachers', { limit: 100 }, { silent: true }),
        get('/subjects/assignments/list', null, { silent: true }),
      ]);
      setClasses(classRes.data || []);
      setTeachers(teachRes.data || []);
      setAssignments(assignRes.data || []);
    } catch { /* handled */ }
  }, [get]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group assignments by class_id
  const assignmentsByClass = {};
  assignments.forEach((a) => {
    if (a.class_id) {
      if (!assignmentsByClass[a.class_id]) assignmentsByClass[a.class_id] = [];
      assignmentsByClass[a.class_id].push(a);
    }
  });

  const resetForm = () => {
    setForm({ name: '', section: '', capacity: 40, academic_year: '', teacher_id: '' });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, capacity: parseInt(form.capacity) || 40 };
      // Send teacher_id as null if empty
      if (!payload.teacher_id) payload.teacher_id = null;

      if (editId) {
        await put(`/classes/${editId}`, payload);
        toast.success('Class updated');
      } else {
        await post('/classes', payload);
        toast.success('Class created');
      }
      setShowForm(false);
      resetForm();
      fetchAll();
    } catch { /* handled */ }
  };

  const handleEdit = (cls) => {
    setEditId(cls.id);
    setForm({
      name: cls.name,
      section: cls.section || '',
      capacity: cls.capacity,
      academic_year: cls.academic_year || '',
      teacher_id: cls.teacher_id || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete class "${name}"?`)) return;
    try {
      await del(`/classes/${id}`);
      toast.success('Class deleted');
      fetchAll();
    } catch { /* handled */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <button onClick={() => { setShowForm(!showForm); resetForm(); }} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Add Class
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold text-gray-800">{editId ? 'Edit Class' : 'New Class'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Class Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required placeholder="e.g. Baby Class" />
            </div>
            <div>
              <label className="label">Section</label>
              <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="input-field" placeholder="e.g. A" />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="input-field" min={1} />
            </div>
            <div>
              <label className="label">Academic Year</label>
              <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} className="input-field" placeholder="2026" />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="label">Class Teacher</label>
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="input-field">
                <option value="">— No teacher assigned —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.user_id}>{t.first_name} {t.last_name}{t.employee_number ? ` (${t.employee_number})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{editId ? 'Update' : 'Create'} Class</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const classAssigns = assignmentsByClass[cls.id] || [];
          return (
            <div key={cls.id} className="card flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{cls.name} {cls.section ? `(${cls.section})` : ''}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Teacher: <span className={cls.teacher_name ? 'text-primary-600 font-medium' : 'text-gray-400 italic'}>{cls.teacher_name || 'Unassigned'}</span>
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-primary-600 font-medium">{cls.pupil_count || 0} pupils</span>
                  <span className="text-gray-400">/ {cls.capacity} capacity</span>
                </div>
                {cls.academic_year && <p className="text-xs text-gray-400 mt-1">Year: {cls.academic_year}</p>}

                {/* Subjects assigned to this class */}
                {classAssigns.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Subjects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {classAssigns.map((a) => (
                        <span key={a.assignment_id} className="text-xs bg-accent-100 text-accent-700 rounded-full px-2.5 py-0.5 font-medium">
                          {a.subject_name}{a.teacher_first_name ? ` · ${a.teacher_first_name} ${a.teacher_last_name[0]}.` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => handleEdit(cls)} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                  <HiOutlinePencil className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => handleDelete(cls.id, cls.name)} className="btn-danger text-sm py-1.5 px-3 flex items-center gap-1">
                  <HiOutlineTrash className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          );
        })}
        {classes.length === 0 && (
          <div className="col-span-full card text-center py-12 text-gray-400">
            <p>No classes yet. Create your first class above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassesPage;
