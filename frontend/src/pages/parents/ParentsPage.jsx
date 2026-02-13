import { useEffect, useState, useCallback, useRef } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineX,
  HiOutlineLink, HiOutlineChevronDown, HiOutlineChevronUp,
  HiOutlineCamera, HiOutlineUser, HiOutlinePrinter, HiOutlineDownload,
  HiOutlineTrash,
} from 'react-icons/hi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', occupation: '', address: '', relationship: 'Parent' };

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

const ParentsPage = () => {
  const { get, post, put, del, loading } = useApi();
  const { user, isPremium } = useAuth();
  const [parents, setParents] = useState([]);
  const [pupils, setPupils] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Photo upload state
  const photoInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Link-child state
  const [linkParentId, setLinkParentId] = useState(null);
  const [linkPupilId, setLinkPupilId] = useState('');
  const [linkPrimary, setLinkPrimary] = useState(true);

  // Expanded parent to show children
  const [expandedParent, setExpandedParent] = useState(null);
  const [childrenData, setChildrenData] = useState({});

  const fetchParents = useCallback(async () => {
    try {
      const res = await get('/parents', search ? { search } : null, { silent: true });
      setParents(res.data || []);
    } catch { /* handled */ }
  }, [get, search]);

  const fetchPupils = useCallback(async () => {
    try {
      const res = await get('/pupils', { limit: 500 }, { silent: true });
      setPupils(res.data?.pupils || res.data || []);
    } catch { /* handled */ }
  }, [get]);

  useEffect(() => { fetchParents(); fetchPupils(); }, [fetchParents, fetchPupils]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditId(null);
    setPhotoPreview(null);
    setCurrentAvatarUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setForm({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      email: p.email || '',
      phone: p.phone || '',
      occupation: p.occupation || '',
      address: p.address || '',
      relationship: p.relationship || 'Parent',
    });
    setCurrentAvatarUrl(p.avatar_url || null);
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

  const uploadPhoto = async (parentId) => {
    const file = photoInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await api.put(`/parents/${parentId}/photo`, formData, {
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
      let parentId = editId;
      if (editId) {
        await put(`/parents/${editId}`, form);
        toast.success('Parent updated');
      } else {
        const res = await post('/parents', { ...form, password: 'Parent@123' });
        parentId = res.data.id;
        toast.success('Parent added');
      }
      if (photoInputRef.current?.files?.[0] && parentId) {
        await uploadPhoto(parentId);
      }
      setShowForm(false);
      resetForm();
      fetchParents();
    } catch { /* handled */ }
  };

  // Link child to parent
  const handleLinkChild = async (e) => {
    e.preventDefault();
    if (!linkPupilId || !linkParentId) return;
    try {
      await post(`/parents/${linkParentId}/link-child`, { pupil_id: linkPupilId, is_primary: linkPrimary });
      toast.success('Child linked to parent');
      setLinkParentId(null);
      setLinkPupilId('');
      setLinkPrimary(true);
      fetchParents();
      if (expandedParent === linkParentId) fetchChildren(linkParentId);
    } catch { /* handled */ }
  };

  const fetchChildren = async (parentId) => {
    try {
      const res = await get(`/parents/${parentId}`, null, { silent: true });
      setChildrenData((prev) => ({ ...prev, [parentId]: res.data?.children || [] }));
    } catch { /* handled */ }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}? This will unlink their children and deactivate their account.`)) return;
    try {
      await del(`/parents/${id}`);
      toast.success('Parent removed');
      fetchParents();
    } catch { /* handled */ }
  };

  const toggleExpand = (parentId) => {
    if (expandedParent === parentId) {
      setExpandedParent(null);
    } else {
      setExpandedParent(parentId);
      if (!childrenData[parentId]) fetchChildren(parentId);
    }
  };

  // ── Print (downloads a PDF) ──
  const handlePrint = async () => {
    toast('Generating parents list…', { icon: '🖨️', duration: 1500 });
    const schoolName = user?.school_name || 'School Manager';
    const schoolLogo = user?.school_badge_url ? await loadImageAsDataUrl(`${API_BASE}${user.school_badge_url}`) : null;
    const brandingText = isPremium
      ? `Generated by ${schoolName} digital system on ${new Date().toLocaleDateString()}`
      : `Generated by School Manager © ${new Date().getFullYear()}`;

    const doc = new jsPDF('landscape');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 15;

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
    doc.text('PARENTS / GUARDIANS DIRECTORY', pw / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.text(`Total Parents: ${parents.length} | Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pw / 2, y, { align: 'center' });
    y += 8;

    doc.setDrawColor(200);
    doc.line(14, y, pw - 14, y);
    y += 5;

    const rows = parents.map((p, i) => [
      i + 1,
      `${p.first_name} ${p.last_name}`,
      p.relationship || 'Parent',
      p.phone || '—',
      p.email || '—',
      p.occupation || '—',
      p.children_count || 0,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Name', 'Relationship', 'Phone', 'Email', 'Occupation', 'Children']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], fontSize: 8, textColor: [255, 255, 255] },
      bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 10 }, 6: { halign: 'center', cellWidth: 18 } },
    });

    doc.setFillColor(30, 58, 95);
    doc.rect(0, ph - 10, pw, 10, 'F');
    doc.setFillColor(240, 173, 78);
    doc.rect(0, ph - 12, pw, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(brandingText, pw / 2, ph - 5, { align: 'center' });

    doc.save(`Parents_List_${schoolName.replace(/\s+/g, '_')}.pdf`);
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
    let y = 15;

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
    doc.text('PARENTS / GUARDIANS DIRECTORY', pw / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.text(`Total Parents: ${parents.length} | Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pw / 2, y, { align: 'center' });
    y += 8;

    doc.setDrawColor(200);
    doc.line(14, y, pw - 14, y);
    y += 5;

    const rows = parents.map((p, i) => [
      i + 1,
      `${p.first_name} ${p.last_name}`,
      p.relationship || 'Parent',
      p.phone || '—',
      p.email || '—',
      p.occupation || '—',
      p.address || '—',
      p.children_count || 0,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Name', 'Relationship', 'Phone', 'Email', 'Occupation', 'Address', 'Children']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], fontSize: 8, textColor: [255, 255, 255] },
      bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
      columnStyles: { 0: { cellWidth: 10 }, 7: { halign: 'center', cellWidth: 18 } },
    });

    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, ph - 10, pw, 10, 'F');
    doc.setFillColor(240, 173, 78);
    doc.rect(0, ph - 12, pw, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(brandingText, pw / 2, ph - 5, { align: 'center' });

    doc.save(`Parents_Directory_${schoolName.replace(/\s+/g, '_')}.pdf`);
  };

  const displayPhoto = photoPreview || (currentAvatarUrl ? `${API_BASE}${currentAvatarUrl}` : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Parents</h1>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownloadPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <HiOutlineDownload className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => { setShowForm(!showForm); resetForm(); }} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> Add Parent
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 border-primary-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{editId ? 'Edit Parent' : 'New Parent'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Photo upload */}
          <div className="flex flex-col items-center mb-2">
            <div className="relative group">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Parent" className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 shadow-md" />
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
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="e.g., +256771234567" />
            </div>
            <div>
              <label className="label">Occupation</label>
              <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Relationship</label>
              <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="input-field">
                <option value="Parent">Parent</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
            </div>
          </div>
          {!editId && (
            <p className="text-xs text-gray-400">Default password: Parent@123 (parent should change it after first login)</p>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || uploading} className="btn-primary">
              {loading || uploading ? 'Saving...' : editId ? 'Update Parent' : 'Add Parent'}
            </button>
          </div>
        </form>
      )}

      {/* Link Child Modal */}
      {linkParentId && (
        <form onSubmit={handleLinkChild} className="card space-y-4 border-accent-200 bg-accent-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              Link Child to {parents.find((p) => p.id === linkParentId)?.first_name} {parents.find((p) => p.id === linkParentId)?.last_name}
            </h3>
            <button type="button" onClick={() => setLinkParentId(null)} className="p-1 rounded hover:bg-gray-100">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="label">Select Pupil *</label>
              <select value={linkPupilId} onChange={(e) => setLinkPupilId(e.target.value)} className="input-field" required>
                <option value="">— Choose a pupil —</option>
                {pupils.map((p) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.class_name ? ` (${p.class_name})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={linkPrimary} onChange={(e) => setLinkPrimary(e.target.checked)} className="rounded border-gray-300 text-primary-500 focus:ring-primary-400" />
                Primary guardian
              </label>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setLinkParentId(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Linking...' : 'Link Child'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input placeholder="Search parents..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {/* Parents Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3 hidden sm:table-cell">Phone</th>
              <th className="text-left p-3 hidden md:table-cell">Email</th>
              <th className="text-center p-3">Children</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => (
              <>
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      {p.avatar_url ? (
                        <img
                          src={`${API_BASE}${p.avatar_url}`}
                          alt={`${p.first_name} ${p.last_name}`}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <span>{p.first_name} {p.last_name}</span>
                        {p.relationship && p.relationship !== 'Parent' && (
                          <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{p.relationship}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600 hidden sm:table-cell">{p.phone || '—'}</td>
                  <td className="p-3 text-gray-600 hidden md:table-cell">{p.email || '—'}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleExpand(p.id)} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-600 rounded text-xs font-medium hover:bg-primary-200 transition">
                      {p.children_count || 0}
                      {expandedParent === p.id ? <HiOutlineChevronUp className="w-3 h-3" /> : <HiOutlineChevronDown className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-500" title="Edit parent">
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setLinkParentId(p.id); setLinkPupilId(''); setLinkPrimary(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-accent-500"
                        title="Link a child"
                      >
                        <HiOutlineLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, `${p.first_name} ${p.last_name}`)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Remove parent"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Expanded children row */}
                {expandedParent === p.id && (
                  <tr key={`${p.id}-children`} className="bg-gray-50">
                    <td colSpan="5" className="px-6 py-3">
                      {childrenData[p.id] ? (
                        childrenData[p.id].length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Linked Children</p>
                            <div className="flex flex-wrap gap-2">
                              {childrenData[p.id].map((child) => (
                                <span key={child.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm">
                                  {child.photo_url ? (
                                    <img src={`${API_BASE}${child.photo_url}`} alt="" className="w-6 h-6 rounded-full object-cover" />
                                  ) : (
                                    <span className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-[10px]">
                                      {child.first_name?.[0]}{child.last_name?.[0]}
                                    </span>
                                  )}
                                  <span className="font-medium text-gray-700">{child.first_name} {child.last_name}</span>
                                  {child.class_name && <span className="text-xs text-gray-400">({child.class_name})</span>}
                                  {child.is_primary && <span className="text-[10px] px-1 bg-green-100 text-green-600 rounded font-medium">Primary</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No children linked yet. Use the <HiOutlineLink className="inline w-4 h-4" /> button to link a pupil.</p>
                        )
                      ) : (
                        <p className="text-sm text-gray-400">Loading...</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {parents.length === 0 && (
              <tr><td colSpan="5" className="text-center py-12 text-gray-400">No parents found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParentsPage;
