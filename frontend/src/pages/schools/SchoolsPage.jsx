import { useEffect, useState, useCallback } from 'react';
import useApi from '../../hooks/useApi';
import toast from 'react-hot-toast';
import {
  HiOutlineAcademicCap,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineRefresh,
  HiOutlineLightningBolt,
  HiOutlineX,
} from 'react-icons/hi';

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter', color: 'bg-gray-100 text-gray-700' },
  { value: 'standard', label: 'Standard', color: 'bg-blue-100 text-blue-700' },
  { value: 'pro', label: 'Pro', color: 'bg-purple-100 text-purple-700' },
];

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'suspended', label: 'Suspended' },
];

const DURATION_PRESETS = [
  { label: '1 Month', months: 1 },
  { label: '1 Term (4 mo)', months: 4 },
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
];

const COUNTRY_OPTIONS = [
  'Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan',
  'DR Congo', 'Ethiopia', 'Somalia', 'Nigeria', 'Ghana', 'South Africa',
  'Zambia', 'Zimbabwe', 'Malawi', 'Mozambique', 'Cameroon', 'Senegal', 'Other',
];

const SchoolsPage = () => {
  const { get, put, loading } = useApi();
  const [schools, setSchools] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Upgrade modal
  const [upgradeModal, setUpgradeModal] = useState({ open: false, school: null });
  const [upgradeForm, setUpgradeForm] = useState({
    plan_type: 'standard',
    subscription_status: 'active',
    subscription_expires_at: '',
  });

  const limit = 20;

  const fetchSchools = useCallback(async () => {
    try {
      const res = await get('/schools', { page, limit, search: search || undefined });
      setSchools(res.data?.schools || []);
      setTotal(res.data?.total || 0);
    } catch {
      // handled by useApi
    }
  }, [get, page, search]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSchools();
  };

  /* ─── Inline edit ─── */
  const startEdit = (school) => {
    setEditingId(school.id);
    setEditForm({
      name: school.name || '',
      email: school.email || '',
      phone: school.phone || '',
      country: school.country || '',
      district: school.district || '',
      region: school.region || '',
      is_active: school.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (schoolId) => {
    try {
      await put(`/schools/${schoolId}`, editForm);
      toast.success('School updated successfully');
      setEditingId(null);
      fetchSchools();
    } catch {
      // handled
    }
  };

  const toggleActive = async (school) => {
    try {
      await put(`/schools/${school.id}`, { is_active: !school.is_active });
      toast.success(`School ${school.is_active ? 'deactivated' : 'activated'}`);
      fetchSchools();
    } catch {
      // handled
    }
  };

  /* ─── Upgrade modal ─── */
  const openUpgradeModal = (school) => {
    const currentExpiry = school.subscription_expires_at
      ? new Date(school.subscription_expires_at).toISOString().split('T')[0]
      : '';
    setUpgradeForm({
      plan_type: school.plan_type || 'starter',
      subscription_status: school.subscription_status || 'trial',
      subscription_expires_at: currentExpiry,
    });
    setUpgradeModal({ open: true, school });
  };

  const closeUpgradeModal = () => {
    setUpgradeModal({ open: false, school: null });
  };

  const applyDurationPreset = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setUpgradeForm((prev) => ({
      ...prev,
      subscription_expires_at: d.toISOString().split('T')[0],
    }));
  };

  const handleUpgradeSave = async () => {
    if (!upgradeModal.school) return;
    try {
      await put(`/schools/${upgradeModal.school.id}`, {
        plan_type: upgradeForm.plan_type,
        subscription_status: upgradeForm.subscription_status,
        subscription_expires_at: upgradeForm.subscription_expires_at
          ? new Date(upgradeForm.subscription_expires_at).toISOString()
          : null,
      });
      toast.success(`${upgradeModal.school.name} upgraded to ${upgradeForm.plan_type} (${upgradeForm.subscription_status})`);
      closeUpgradeModal();
      fetchSchools();
    } catch {
      // handled
    }
  };

  /* ─── Badges ─── */
  const statusBadge = (status) => {
    const map = {
      active: 'bg-emerald-100 text-emerald-700',
      trial: 'bg-amber-100 text-amber-700',
      expired: 'bg-red-100 text-red-700',
      suspended: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  const planBadge = (plan) => {
    const opt = PLAN_OPTIONS.find((p) => p.value === plan);
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${opt?.color || 'bg-gray-100 text-gray-600'}`}>
        {plan}
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <HiOutlineAcademicCap className="w-7 h-7 text-primary-500" />
              Schools Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">{total} school{total !== 1 ? 's' : ''} registered</p>
          </div>

          <button
            onClick={fetchSchools}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 self-start sm:self-auto"
            title="Refresh"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative max-w-md">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by school name or district..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!e.target.value) { setPage(1); } }}
            className="input-field pl-11 pr-20 w-full"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="text-left p-3">School</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Location</th>
              <th className="text-center p-3">Plan</th>
              <th className="text-center p-3">Status</th>
              <th className="text-center p-3">Expires</th>
              <th className="text-center p-3">Active</th>
              <th className="text-left p-3">Registered</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schools.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-8 text-center text-gray-400">
                  No schools found.
                </td>
              </tr>
            ) : (
              schools.map((school) => (
                <tr key={school.id} className="border-b border-gray-50 hover:bg-gray-50">
                  {editingId === school.id ? (
                    /* ── Editing row (basic info only) ── */
                    <>
                      <td className="p-2">
                        <input
                          className="input-field text-xs"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </td>
                      <td className="p-2 space-y-1">
                        <input
                          className="input-field text-xs"
                          placeholder="Email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                        <input
                          className="input-field text-xs"
                          placeholder="Phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      </td>
                      <td className="p-2 space-y-1">
                        <select
                          className="input-field text-xs"
                          value={editForm.country}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        >
                          <option value="">Country</option>
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          className="input-field text-xs"
                          placeholder="District"
                          value={editForm.district}
                          onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                        />
                        <input
                          className="input-field text-xs"
                          placeholder="Region"
                          value={editForm.region}
                          onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                        />
                      </td>
                      <td className="p-3 text-center">{planBadge(school.plan_type)}</td>
                      <td className="p-3 text-center">{statusBadge(school.subscription_status)}</td>
                      <td className="p-3 text-center text-xs text-gray-400">
                        {school.subscription_expires_at
                          ? new Date(school.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary-500"
                        />
                      </td>
                      <td className="p-3 text-gray-500 text-xs">
                        {new Date(school.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => saveEdit(school.id)}
                            disabled={loading}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            title="Save"
                          >
                            <HiOutlineCheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                            title="Cancel"
                          >
                            <HiOutlineXCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* ── Display row ── */
                    <>
                      <td className="p-3">
                        <p className="font-medium text-gray-800">{school.name}</p>
                        {school.motto && <p className="text-xs text-gray-400 truncate max-w-[200px]">{school.motto}</p>}
                      </td>
                      <td className="p-3">
                        <p className="text-gray-600 text-xs">{school.email || '—'}</p>
                        <p className="text-gray-500 text-xs">{school.phone || '—'}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-gray-600 text-xs">{school.district || '—'}</p>
                        <p className="text-gray-400 text-xs">{school.region || ''}</p>
                        {school.country && <p className="text-gray-400 text-xs font-medium">{school.country}</p>}
                      </td>
                      <td className="p-3 text-center">{planBadge(school.plan_type)}</td>
                      <td className="p-3 text-center">{statusBadge(school.subscription_status)}</td>
                      <td className="p-3 text-center text-xs text-gray-400">
                        {school.subscription_expires_at
                          ? new Date(school.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleActive(school)}
                          className={`p-1 rounded-full ${school.is_active ? 'text-emerald-500' : 'text-gray-400'}`}
                          title={school.is_active ? 'Active – click to deactivate' : 'Inactive – click to activate'}
                        >
                          {school.is_active ? (
                            <HiOutlineCheckCircle className="w-5 h-5" />
                          ) : (
                            <HiOutlineXCircle className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">
                        {new Date(school.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openUpgradeModal(school)}
                            className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
                            title="Upgrade / Change Plan"
                          >
                            <HiOutlineLightningBolt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEdit(school)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            title="Edit school info"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary text-xs px-4 py-2 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm font-medium text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-secondary text-xs px-4 py-2 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════
       *  Upgrade / Change Plan Modal
       * ═══════════════════════════════════════ */}
      {upgradeModal.open && upgradeModal.school && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <HiOutlineLightningBolt className="w-5 h-5 text-purple-600" />
                  Manage Plan
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{upgradeModal.school.name}</p>
              </div>
              <button onClick={closeUpgradeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Current info */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Current:</div>
                {planBadge(upgradeModal.school.plan_type)}
                {statusBadge(upgradeModal.school.subscription_status)}
                {upgradeModal.school.subscription_expires_at && (
                  <span className="text-xs text-gray-400">
                    expires {new Date(upgradeModal.school.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Plan selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
                <div className="flex gap-2">
                  {PLAN_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUpgradeForm((prev) => ({ ...prev, plan_type: opt.value }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        upgradeForm.plan_type === opt.value
                          ? opt.value === 'pro'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : opt.value === 'standard'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-400 bg-gray-50 text-gray-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Status</label>
                <select
                  className="input-field w-full"
                  value={upgradeForm.subscription_status}
                  onChange={(e) => setUpgradeForm((prev) => ({ ...prev, subscription_status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Expiry date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Expires</label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={upgradeForm.subscription_expires_at}
                  onChange={(e) => setUpgradeForm((prev) => ({ ...prev, subscription_expires_at: e.target.value }))}
                />
                {/* Quick duration buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.months}
                      type="button"
                      onClick={() => applyDurationPreset(preset.months)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={closeUpgradeModal} className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                onClick={handleUpgradeSave}
                disabled={loading}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <HiOutlineCheckCircle className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolsPage;
