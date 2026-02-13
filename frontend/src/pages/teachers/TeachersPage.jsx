import { useEffect, useState, useCallback, useRef } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineX,
  HiOutlineCamera, HiOutlineUser, HiOutlinePrinter, HiOutlineDownload,
  HiOutlineAcademicCap, HiOutlineTrash,
} from 'react-icons/hi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '',
  qualification: '', employee_number: '', specialization: '', nin: '', salary: '',
};

/** Load an image URL as a data URL for embedding in PDF */
const loadImageAsDataUrl = async (url) => {
  if (!url) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight };
  } catch { return null; }
};

const TeachersPage = () => {
  const { get, post, put, del, loading } = useApi();
  const { user, isPremium } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Photo upload state
  const photoInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchTeachers = useCallback(async () => {
    try {
      const [res, assignRes] = await Promise.all([
        get('/teachers', search ? { search } : null, { silent: true }),
        get('/subjects/assignments/list', null, { silent: true }),
      ]);
      setTeachers(res.data || []);
      setAssignments(assignRes.data || []);
    } catch { /* handled */ }
  }, [get, search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  // Group assignments by teacher_id
  const assignmentsByTeacher = {};
  assignments.forEach((a) => {
    if (!assignmentsByTeacher[a.teacher_id]) assignmentsByTeacher[a.teacher_id] = [];
    assignmentsByTeacher[a.teacher_id].push(a);
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditId(null);
    setPhotoPreview(null);
    setCurrentAvatarUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleEdit = (t) => {
    setEditId(t.id);
    setForm({
      first_name: t.first_name || '',
      last_name: t.last_name || '',
      email: t.email || '',
      phone: t.phone || '',
      qualification: t.qualification || '',
      employee_number: t.employee_number || '',
      specialization: t.specialization || '',
      nin: t.nin || '',
      salary: t.salary || '',
    });
    setCurrentAvatarUrl(t.avatar_url || null);
    setPhotoPreview(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (teacherId) => {
    const file = photoInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await api.put(`/teachers/${teacherId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let teacherId = editId;
      if (editId) {
        const payload = { ...form };
        if (payload.salary) payload.salary = parseFloat(payload.salary);
        else delete payload.salary;
        await put(`/teachers/${editId}`, payload);
        toast.success('Teacher updated');
      } else {
        const res = await post('/teachers', { ...form, password: 'Teacher@123' });
        teacherId = res.data.id;
        toast.success('Teacher added');
      }
      // Upload photo if selected
      if (photoInputRef.current?.files?.[0] && teacherId) {
        await uploadPhoto(teacherId);
      }
      setShowForm(false);
      resetForm();
      fetchTeachers();
    } catch { /* handled */ }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}? This will deactivate their account.`)) return;
    try {
      await del(`/teachers/${id}`);
      toast.success('Teacher removed');
      fetchTeachers();
    } catch { /* handled */ }
  };

  // ── Print (downloads a PDF) ──
  const handlePrint = async () => {
    toast('Generating teachers list…', { icon: '🖨️', duration: 1500 });
    const schoolName = user?.school_name || 'School Manager';
    const schoolLogo = user?.school_badge_url ? await loadImageAsDataUrl(`${API_BASE}${user.school_badge_url}`) : null;
    const brandingText = isPremium
      ? `Generated by ${schoolName} digital system on ${new Date().toLocaleDateString()}`
      : `Generated by School Manager © ${new Date().getFullYear()}`;

    const doc = new jsPDF('landscape');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 15;

    // Header bar
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pw, 10, 'F');
    doc.setFillColor(240, 173, 78);
    doc.rect(0, 10, pw, 2, 'F');

    if (schoolLogo) {
      const imgW = 20;
      const imgH = (schoolLogo.height / schoolLogo.width) * imgW;
      doc.addImage(schoolLogo.dataUrl, 'PNG', (pw - imgW) / 2, y, imgW, imgH);
      y += imgH + 5;
    }

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(schoolName.toUpperCase(), pw / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('TEACHERS DIRECTORY', pw / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.text(`Total Teachers: ${teachers.length} | Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pw / 2, y, { align: 'center' });
    y += 8;

    doc.setDrawColor(200);
    doc.line(14, y, pw - 14, y);
    y += 5;

    const rows = teachers.map((t, i) => [
      i + 1,
      `${t.first_name} ${t.last_name}`,
      t.email || '—',
      t.phone || '—',
      t.employee_number || '—',
      t.qualification || '—',
      t.specialization || '—',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Name', 'Email', 'Phone', 'Employee #', 'Qualification', 'Specialization']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], fontSize: 8, textColor: [255, 255, 255] },
      bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 10 } },
    });

    // Footer
    doc.setFillColor(30, 58, 95);
    doc.rect(0, ph - 10, pw, 10, 'F');
    doc.setFillColor(240, 173, 78);
    doc.rect(0, ph - 12, pw, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(brandingText, pw / 2, ph - 5, { align: 'center' });

    doc.save(`Teachers_List_${schoolName.replace(/\s+/g, '_')}.pdf`);
  };

  // ── PDF Download ──
  const handleDownloadPDF = async () => {
    toast('Generating PDF…', { icon: '📄', duration: 1500 });
    const schoolName = user?.school_name || 'School Manager';
    const schoolLogo = user?.school_badge_url ? await loadImageAsDataUrl(`${API_BASE}${user.school_badge_url}`) : null;
    const brandingText = isPremium
      ? `Generated by ${schoolName} digital system on ${new Date().toLocaleDateString()}`
      : `Generated by School Manager © ${new Date().getFullYear()}`;

    const doc = new jsPDF('landscape');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 15;

    // Header bar
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pw, 10, 'F');
    doc.setFillColor(240, 173, 78);
    doc.rect(0, 10, pw, 2, 'F');

    if (schoolLogo) {
      const imgW = 20;
      const imgH = (schoolLogo.height / schoolLogo.width) * imgW;
      doc.addImage(schoolLogo.dataUrl, 'PNG', (pw - imgW) / 2, y, imgW, imgH);
      y += imgH + 5;
    }

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(schoolName.toUpperCase(), pw / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('TEACHERS DIRECTORY', pw / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.text(`Total Teachers: ${teachers.length} | Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pw / 2, y, { align: 'center' });
    y += 8;

    doc.setDrawColor(200);
    doc.line(14, y, pw - 14, y);
    y += 5;

    const rows = teachers.map((t, i) => [
      i + 1,
      `${t.first_name} ${t.last_name}`,
      t.email || '—',
      t.phone || '—',
      t.employee_number || '—',
      t.qualification || '—',
      t.specialization || '—',
      t.salary > 0 ? `UGX ${Number(t.salary).toLocaleString()}` : '—',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Name', 'Email', 'Phone', 'Employee #', 'Qualification', 'Specialization', 'Salary']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], fontSize: 8, textColor: [255, 255, 255] },
      bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 10 }, 7: { halign: 'right' } },
    });

    // Footer
    doc.setFillColor(30, 58, 95);
    doc.rect(0, ph - 10, pw, 10, 'F');
    doc.setFillColor(240, 173, 78);
    doc.rect(0, ph - 12, pw, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(brandingText, pw / 2, ph - 5, { align: 'center' });

    doc.save(`Teachers_Directory_${schoolName.replace(/\s+/g, '_')}.pdf`);
  };

  // Display photo
  const displayPhoto = photoPreview || (currentAvatarUrl ? `${API_BASE}${currentAvatarUrl}` : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownloadPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <HiOutlineDownload className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => { setShowForm(!showForm); resetForm(); }}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlinePlus className="w-5 h-5" /> Add Teacher
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 border-primary-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{editId ? 'Edit Teacher' : 'New Teacher'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Photo upload */}
          <div className="flex flex-col items-center mb-2">
            <div className="relative group">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Teacher" className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 shadow-md" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-4 border-primary-50 shadow-md">
                  <HiOutlineUser className="w-10 h-10 text-primary-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-white"
                title="Upload photo"
              >
                <HiOutlineCamera className="w-4 h-4" />
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {photoPreview ? 'New photo selected — saved with form' : 'Click camera to upload a photo'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="label">Email {editId ? '' : '*'}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" {...(!editId ? { required: !form.phone } : {})} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="e.g., +256771234567" />
            </div>
            <div>
              <label className="label">Employee Number</label>
              <input value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Qualification</label>
              <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} className="input-field" placeholder="e.g., B.Ed, Diploma" />
            </div>
            <div>
              <label className="label">Specialization</label>
              <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="input-field" placeholder="e.g., Mathematics" />
            </div>
            <div>
              <label className="label">NIN</label>
              <input value={form.nin} onChange={(e) => setForm({ ...form, nin: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Salary (UGX)</label>
              <input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="input-field" min="0" />
            </div>
          </div>
          {!editId && (
            <p className="text-xs text-gray-400">Default password: Teacher@123 (teacher should change it after first login)</p>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || uploading} className="btn-primary">
              {loading || uploading ? 'Saving...' : editId ? 'Update Teacher' : 'Add Teacher'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search teachers..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((t) => {
          const teacherAssigns = assignmentsByTeacher[t.id] || [];
          return (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {t.avatar_url ? (
                    <img
                      src={`${API_BASE}${t.avatar_url}`}
                      alt={`${t.first_name} ${t.last_name}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary-100"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                      {t.first_name[0]}{t.last_name[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800">{t.first_name} {t.last_name}</h3>
                    <p className="text-xs text-gray-500">{t.employee_number || 'No employee #'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(t)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-500 transition"
                    title="Edit teacher"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, `${t.first_name} ${t.last_name}`)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                    title="Remove teacher"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {t.email && <p>📧 {t.email}</p>}
                {t.phone && <p>📱 {t.phone}</p>}
                {t.qualification && <p>🎓 {t.qualification}</p>}
                {t.specialization && <p>📚 {t.specialization}</p>}
                {t.salary > 0 && <p>💰 UGX {Number(t.salary).toLocaleString()}</p>}
              </div>

              {/* Assigned subjects */}
              {teacherAssigns.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {teacherAssigns.map((a) => (
                      <span key={a.assignment_id} className="text-xs bg-accent-100 text-accent-700 rounded-full px-2.5 py-0.5 font-medium">
                        {a.subject_name}{a.class_name ? ` · ${a.class_name}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {teachers.length === 0 && (
          <div className="col-span-full card text-center py-12 text-gray-400">No teachers found</div>
        )}
      </div>
    </div>
  );
};

export default TeachersPage;
