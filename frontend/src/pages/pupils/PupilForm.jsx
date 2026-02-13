import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlineCalendar, HiOutlineCamera, HiOutlineUser,
  HiOutlineChevronDown, HiOutlineChevronUp,
  HiOutlinePrinter, HiOutlineAcademicCap, HiOutlineHeart,
  HiOutlinePhone, HiOutlineHome, HiOutlineClipboardList,
} from 'react-icons/hi';
import jsPDF from 'jspdf';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

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

/* ────────────── Section Wrapper ────────────── */
const Section = ({ icon: Icon, title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {Icon && <Icon className="w-4 h-4 text-primary-500" />}
          {title}
        </span>
        {open ? <HiOutlineChevronUp className="w-4 h-4 text-gray-400" /> : <HiOutlineChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
};

const PupilForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user, isPremium } = useAuth();
  const { get, post, put, loading } = useApi();
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const dobRef = useRef(null);
  const photoInputRef = useRef(null);

  /* ── form state (all admission fields) ── */
  const [form, setForm] = useState({
    // Personal
    first_name: '', last_name: '', other_names: '', gender: '', date_of_birth: '',
    nationality: 'Ugandan', religion: '',
    // School
    admission_number: '', class_id: '', enrollment_type: 'new', is_boarding: false,
    // Contact
    address: '', district: '',
    // Previous school
    previous_school: '', previous_class: '', reason_for_leaving: '',
    // Health
    medical_notes: '', blood_group: '', allergies: '', disabilities: '',
    // Emergency
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    // Parent link
    parent_id: '',
  });

  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  /* ── fetch data ── */
  const fetchClasses = useCallback(async () => {
    try { const res = await get('/classes', null, { silent: true }); setClasses(res.data || []); } catch { /* */ }
  }, [get]);

  const fetchParents = useCallback(async () => {
    try { const res = await get('/parents', null, { silent: true }); setParents(res.data || []); } catch { /* */ }
  }, [get]);

  const fetchPupil = useCallback(async () => {
    if (!isEdit) return;
    try {
      const res = await get(`/pupils/${id}`, null, { silent: true });
      const p = res.data;
      setForm({
        first_name: p.first_name || '', last_name: p.last_name || '', other_names: p.other_names || '',
        gender: p.gender || '', date_of_birth: p.date_of_birth?.slice(0, 10) || '',
        nationality: p.nationality || 'Ugandan', religion: p.religion || '',
        admission_number: p.admission_number || '', class_id: p.class_id || '',
        enrollment_type: p.enrollment_type || 'new', is_boarding: !!p.is_boarding,
        address: p.address || '', district: p.district || '',
        previous_school: p.previous_school || '', previous_class: p.previous_class || '',
        reason_for_leaving: p.reason_for_leaving || '',
        medical_notes: p.medical_notes || '', blood_group: p.blood_group || '',
        allergies: p.allergies || '', disabilities: p.disabilities || '',
        emergency_contact_name: p.emergency_contact_name || '',
        emergency_contact_phone: p.emergency_contact_phone || '',
        emergency_contact_relationship: p.emergency_contact_relationship || '',
        parent_id: '',
      });
      if (p.photo_url) setPhotoUrl(p.photo_url);
    } catch { /* */ }
  }, [get, id, isEdit]);

  useEffect(() => { fetchClasses(); fetchParents(); fetchPupil(); }, [fetchClasses, fetchParents, fetchPupil]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  /* ── photo ── */
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (pupilId) => {
    const file = photoInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await api.put(`/pupils/${pupilId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotoUrl(data.data.photo_url);
      setPhotoPreview(null);
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Photo upload failed');
    } finally { setUploading(false); }
  };

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.class_id) delete payload.class_id;
      if (!payload.date_of_birth) delete payload.date_of_birth;
      if (!payload.parent_id) delete payload.parent_id;
      // Clean empty strings to null for optional fields
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });
      // Keep required fields
      payload.first_name = form.first_name;
      payload.last_name = form.last_name;

      let pupilId = id;
      if (isEdit) {
        await put(`/pupils/${id}`, payload);
        toast.success('Pupil updated');
      } else {
        const res = await post('/pupils', payload);
        pupilId = res.data.id;
        toast.success('Pupil enrolled successfully!');
      }

      if (photoInputRef.current?.files?.[0] && pupilId) {
        await uploadPhoto(pupilId);
      }

      navigate('/pupils');
    } catch { /* handled */ }
  };

  /* ── print admission form (generates a PDF) ── */
  const handlePrintAdmission = async () => {
    toast('Generating admission form…', { icon: '📋', duration: 1500 });
    const schoolName = user?.school_name || 'School Manager';
    const schoolLogo = user?.school_badge_url ? await loadImageAsDataUrl(`${API_BASE}${user.school_badge_url}`) : null;

    // Load the pupil's photo (from preview or saved URL)
    const pupilPhotoSrc = photoPreview || (photoUrl ? `${API_BASE}${photoUrl}` : null);
    const pupilPhoto = pupilPhotoSrc ? await loadImageAsDataUrl(pupilPhotoSrc) : null;

    const pupilName = `${form.first_name} ${form.other_names ? form.other_names + ' ' : ''}${form.last_name}`.trim() || 'Pupil';
    const className = classes.find((c) => c.id === form.class_id)?.name || '—';
    const parentObj = parents.find((p) => p.id === form.parent_id);
    const parentName = parentObj ? `${parentObj.first_name} ${parentObj.last_name}` : '—';
    const brandingText = isPremium
      ? `Generated by ${schoolName} digital system on ${new Date().toLocaleDateString()}`
      : `Generated by School Manager © ${new Date().getFullYear()}`;

    const doc = new jsPDF();
    const pgW = doc.internal.pageSize.getWidth();
    const pgH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 14;

    // ─── School logo (small, left-aligned) ───
    if (schoolLogo) {
      const imgW = 14;
      const imgH = (schoolLogo.height / schoolLogo.width) * imgW;
      doc.addImage(schoolLogo.dataUrl, 'PNG', (pgW - imgW) / 2, y, imgW, imgH);
      y += imgH + 2;
    }

    // ─── School name ───
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(schoolName.toUpperCase(), pgW / 2, y, { align: 'center' });
    y += 6;

    // ─── Form title ───
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('PUPIL ADMISSION FORM', pgW / 2, y, { align: 'center' });
    y += 5;

    // ─── Thin separator line ───
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pgW - margin, y);
    y += 6;

    // ─── Photo box (top-right corner) ───
    const photoBoxW = 26;
    const photoBoxH = 32;
    const photoX = pgW - margin - photoBoxW;
    const photoY = y;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.roundedRect(photoX, photoY, photoBoxW, photoBoxH, 2, 2, 'S');

    if (pupilPhoto) {
      // Embed the actual pupil photo, fitted within the box with a small inset
      const inset = 1;
      const boxInnerW = photoBoxW - inset * 2;
      const boxInnerH = photoBoxH - inset * 2;
      const imgRatio = pupilPhoto.height / pupilPhoto.width;
      let drawW = boxInnerW;
      let drawH = drawW * imgRatio;
      if (drawH > boxInnerH) {
        drawH = boxInnerH;
        drawW = drawH / imgRatio;
      }
      const imgX = photoX + inset + (boxInnerW - drawW) / 2;
      const imgY = photoY + inset + (boxInnerH - drawH) / 2;
      doc.addImage(pupilPhoto.dataUrl, 'PNG', imgX, imgY, drawW, drawH);
    } else {
      // Placeholder text when no photo
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text('Passport', photoX + photoBoxW / 2, photoY + 13, { align: 'center' });
      doc.text('Photo', photoX + photoBoxW / 2, photoY + 18, { align: 'center' });
    }

    // ─── Helper: section title (clean gray background, no blue) ───
    const sectionTitle = (title) => {
      if (y > pgH - 40) { doc.addPage(); y = 15; }
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin, y, pgW - margin * 2, 7, 1, 1, 'F');
      doc.setFontSize(8.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(title, margin + 3, y + 5);
      y += 11;
    };

    // ─── Helper: draw field rows ───
    const drawFields = (fields, cols = 3) => {
      const gutter = 6;
      const usable = pgW - margin * 2;
      const colW = (usable - gutter * (cols - 1)) / cols;
      let col = 0;
      fields.forEach(([label, value]) => {
        const x = margin + col * (colW + gutter);
        // Label
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(140, 140, 140);
        doc.text(label.toUpperCase(), x, y);
        // Value
        doc.setFontSize(9);
        doc.setFont(undefined, value ? 'bold' : 'normal');
        doc.setTextColor(value ? 30 : 200, value ? 30 : 200, value ? 30 : 200);
        doc.text(value || '—', x, y + 4.5);
        // Light dotted underline
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.2);
        doc.line(x, y + 6, x + colW, y + 6);
        col++;
        if (col >= cols) { col = 0; y += 11; }
      });
      if (col !== 0) y += 11;
    };

    // ─── 1. Personal Information ───
    sectionTitle('1.  PERSONAL INFORMATION');
    drawFields([['Surname', form.last_name], ['First Name', form.first_name], ['Other Names', form.other_names]], 3);
    drawFields([['Gender', form.gender], ['Date of Birth', form.date_of_birth], ['Nationality', form.nationality]], 3);
    drawFields([['Religion', form.religion], ['Blood Group', form.blood_group]], 2);

    // ─── 2. School Information ───
    sectionTitle('2.  SCHOOL INFORMATION');
    drawFields([['Admission Number', form.admission_number], ['Class', className], ['Enrollment Type', form.enrollment_type]], 3);
    drawFields([['Boarding / Day', form.is_boarding ? 'Boarding' : 'Day'], ['Date of Admission', new Date().toLocaleDateString('en-GB')]], 2);

    // ─── 3. Contact & Residence ───
    sectionTitle('3.  CONTACT & RESIDENCE');
    drawFields([['Address / Village', form.address], ['District', form.district]], 2);

    // ─── 4. Previous School ───
    sectionTitle('4.  PREVIOUS SCHOOL');
    drawFields([['School Name', form.previous_school], ['Class Completed', form.previous_class], ['Reason for Leaving', form.reason_for_leaving]], 3);

    // ─── 5. Health & Medical ───
    sectionTitle('5.  HEALTH & MEDICAL INFORMATION');
    drawFields([['Blood Group', form.blood_group], ['Allergies', form.allergies], ['Disabilities', form.disabilities]], 3);
    drawFields([['Medical Notes', form.medical_notes]], 1);

    // ─── 6. Emergency Contact ───
    sectionTitle('6.  EMERGENCY CONTACT');
    drawFields([['Contact Name', form.emergency_contact_name], ['Phone', form.emergency_contact_phone], ['Relationship', form.emergency_contact_relationship]], 3);

    // ─── 7. Parent / Guardian ───
    sectionTitle('7.  PARENT / GUARDIAN');
    drawFields([['Full Name', parentName], ['Phone', parentObj?.phone || '—'], ['Email', parentObj?.email || '—']], 3);

    // ─── Signature lines ───
    y += 8;
    if (y > pgH - 45) { doc.addPage(); y = 20; }
    const sigW = (pgW - margin * 2 - 20) / 3;
    ['Parent / Guardian Signature', 'School Admin Signature', 'Date'].forEach((label, i) => {
      const x = margin + i * (sigW + 10);
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.3);
      doc.line(x, y + 18, x + sigW, y + 18);
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(130, 130, 130);
      doc.text(label, x + sigW / 2, y + 23, { align: 'center' });
    });

    // ─── Clean footer (no colored bars) ───
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pgH - 14, pgW - margin, pgH - 14);
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text(brandingText, pgW / 2, pgH - 9, { align: 'center' });

    doc.save(`Admission_Form_${pupilName.replace(/\s+/g, '_')}.pdf`);
    toast.success('Admission form downloaded!');
  };

  const displayPhoto = photoPreview || (photoUrl ? `${API_BASE}${photoUrl}` : null);

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Pupil' : '📋 Pupil Admission Form'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Update pupil details below' : 'Fill in all relevant sections to enroll a new pupil'}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrintAdmission}
          className="btn-secondary flex items-center gap-2"
          title="Print admission form"
        >
          <HiOutlinePrinter className="w-4 h-4" />
          Print Form
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ─── Photo ─── */}
        <div className="card flex flex-col items-center py-6">
          <div className="relative group">
            {displayPhoto ? (
              <img src={displayPhoto} alt="Student" className="w-32 h-32 rounded-full object-cover border-4 border-primary-100 shadow-md" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-4 border-primary-50 shadow-md">
                <HiOutlineUser className="w-14 h-14 text-primary-400" />
              </div>
            )}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-white"
              title="Upload photo"
            >
              <HiOutlineCamera className="w-5 h-5" />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {photoPreview ? 'New photo selected — will be saved with the form' : 'Click the camera icon to upload a passport photo'}
          </p>
          {uploading && (
            <div className="flex items-center gap-2 text-xs text-primary-500 mt-1">
              <div className="w-3 h-3 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
              Uploading…
            </div>
          )}
        </div>

        {/* ─── 1. Personal Information ─── */}
        <Section icon={HiOutlineUser} title="1. Personal Information" defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Surname (Last Name) *</label>
              <input name="last_name" value={form.last_name} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="label">First Name *</label>
              <input name="first_name" value={form.first_name} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="label">Other Names</label>
              <input name="other_names" value={form.other_names} onChange={handleChange} className="input-field" placeholder="Middle / other names" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} className="input-field">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <div className="relative">
                <button type="button" onClick={() => dobRef.current?.showPicker?.() || dobRef.current?.focus()}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors cursor-pointer z-10">
                  <HiOutlineCalendar className="w-5 h-5" />
                </button>
                <input ref={dobRef} name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange}
                  className="input-field pl-10 cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="label">Nationality</label>
              <input name="nationality" value={form.nationality} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Religion</label>
              <select name="religion" value={form.religion} onChange={handleChange} className="input-field">
                <option value="">Select</option>
                <option value="Christian">Christian</option>
                <option value="Muslim">Muslim</option>
                <option value="Hindu">Hindu</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </Section>

        {/* ─── 2. School Information ─── */}
        <Section icon={HiOutlineAcademicCap} title="2. School Information" defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Admission Number</label>
              <input name="admission_number" value={form.admission_number} onChange={handleChange} className="input-field" placeholder="Auto-generated if left blank" />
            </div>
            <div>
              <label className="label">Class</label>
              <select name="class_id" value={form.class_id} onChange={handleChange} className="input-field">
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Enrollment Type</label>
              <select name="enrollment_type" value={form.enrollment_type} onChange={handleChange} className="input-field">
                <option value="new">New Admission</option>
                <option value="transfer">Transfer</option>
                <option value="repeating">Repeating</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_boarding" checked={form.is_boarding} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
              <span className="text-sm text-gray-700 font-medium">Boarding Student</span>
            </div>
          </div>
        </Section>

        {/* ─── 3. Contact & Residence ─── */}
        <Section icon={HiOutlineHome} title="3. Contact & Residence" defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Address / Village</label>
              <input name="address" value={form.address} onChange={handleChange} className="input-field" placeholder="e.g., Kampala, Wandegeya" />
            </div>
            <div>
              <label className="label">District</label>
              <input name="district" value={form.district} onChange={handleChange} className="input-field" placeholder="e.g., Kampala" />
            </div>
          </div>
        </Section>

        {/* ─── 4. Previous School (show if transfer) ─── */}
        <Section icon={HiOutlineClipboardList} title="4. Previous School" defaultOpen={form.enrollment_type === 'transfer'}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Previous School Name</label>
              <input name="previous_school" value={form.previous_school} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Previous Class</label>
              <input name="previous_class" value={form.previous_class} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Reason for Leaving</label>
              <input name="reason_for_leaving" value={form.reason_for_leaving} onChange={handleChange} className="input-field" />
            </div>
          </div>
        </Section>

        {/* ─── 5. Health & Medical ─── */}
        <Section icon={HiOutlineHeart} title="5. Health & Medical Information" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Blood Group</label>
              <select name="blood_group" value={form.blood_group} onChange={handleChange} className="input-field">
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Allergies</label>
              <input name="allergies" value={form.allergies} onChange={handleChange} className="input-field" placeholder="e.g., Penicillin, Peanuts" />
            </div>
            <div>
              <label className="label">Disabilities</label>
              <input name="disabilities" value={form.disabilities} onChange={handleChange} className="input-field" placeholder="None / Specify" />
            </div>
            <div className="md:col-span-3">
              <label className="label">Additional Medical Notes</label>
              <textarea name="medical_notes" value={form.medical_notes} onChange={handleChange} className="input-field" rows={2} placeholder="Any other medical conditions or special needs" />
            </div>
          </div>
        </Section>

        {/* ─── 6. Emergency Contact ─── */}
        <Section icon={HiOutlinePhone} title="6. Emergency Contact" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Contact Person Name</label>
              <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} className="input-field" placeholder="Full name" />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} className="input-field" placeholder="e.g., +256771234567" />
            </div>
            <div>
              <label className="label">Relationship</label>
              <select name="emergency_contact_relationship" value={form.emergency_contact_relationship} onChange={handleChange} className="input-field">
                <option value="">Select</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </Section>

        {/* ─── 7. Parent / Guardian Link ─── */}
        <Section icon={HiOutlineUser} title="7. Link Parent / Guardian" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Select Parent / Guardian</label>
              <select name="parent_id" value={form.parent_id} onChange={handleChange} className="input-field">
                <option value="">— None —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">You can also link parents later from the Parents page.</p>
            </div>
          </div>
        </Section>

        {/* ─── Action buttons ─── */}
        <div className="card">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button type="button" onClick={() => navigate('/pupils')} className="btn-secondary w-full sm:w-auto">
              Cancel
            </button>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrintAdmission}
                className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <HiOutlinePrinter className="w-4 h-4" />
                Print
              </button>
              <button type="submit" disabled={loading || uploading} className="btn-primary w-full sm:w-auto">
                {loading || uploading ? 'Saving...' : isEdit ? 'Update Pupil' : 'Enroll Pupil'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PupilForm;
