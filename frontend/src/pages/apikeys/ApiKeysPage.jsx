import { useEffect, useState, useCallback } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineKey,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineBan,
  HiOutlineClipboardCopy,
  HiOutlineLockClosed,
  HiOutlineArrowUp,
  HiOutlineCode,
  HiOutlineShieldCheck,
  HiOutlineDatabase,
  HiOutlineX,
  HiOutlineExclamation,
} from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const ApiKeysPage = () => {
  const { planType } = useAuth();
  const isPro = planType === 'pro';
  const { get, post, put, del, loading } = useApi();

  const [keys, setKeys] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState(null); // the raw key shown once
  const [form, setForm] = useState({
    name: '',
    permissions: ['read'],
    rate_limit: 100,
    expires_at: '',
  });

  const fetchKeys = useCallback(async () => {
    try {
      const res = await get('/api-keys', null, { silent: true });
      if (res?.data) {
        setKeys(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      /* handled by useApi */
    }
  }, [get]);

  useEffect(() => {
    if (isPro) fetchKeys();
  }, [isPro, fetchKeys]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please provide a name for the API key');
      return;
    }
    try {
      const payload = {
        name: form.name,
        permissions: form.permissions,
        rate_limit: parseInt(form.rate_limit) || 100,
      };
      if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();

      const res = await post('/api-keys', payload);
      if (res?.data) {
        setNewKeyResult(res.data);
        toast.success('API key created! Copy it now — it will not be shown again.');
        setShowForm(false);
        setForm({ name: '', permissions: ['read'], rate_limit: 100, expires_at: '' });
        fetchKeys();
      }
    } catch {
      /* handled by useApi */
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this API key? It will stop working immediately.')) return;
    try {
      await put(`/api-keys/${id}/revoke`);
      toast.success('API key revoked');
      fetchKeys();
    } catch {
      /* handled by useApi */
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this API key? This cannot be undone.')) return;
    try {
      await del(`/api-keys/${id}`);
      toast.success('API key deleted');
      fetchKeys();
    } catch {
      /* handled by useApi */
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    });
  };

  const togglePermission = (perm) => {
    setForm((prev) => {
      const perms = prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm];
      // Must have at least 'read'
      if (perms.length === 0) perms.push('read');
      return { ...prev, permissions: perms };
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Available external endpoints for documentation
  const endpoints = [
    { method: 'GET', path: '/api/v1/external/school', description: 'Get school information' },
    { method: 'GET', path: '/api/v1/external/pupils', description: 'List pupils (supports ?class_id, ?is_active, ?limit, ?offset)' },
    { method: 'GET', path: '/api/v1/external/teachers', description: 'List active teachers' },
    { method: 'GET', path: '/api/v1/external/classes', description: 'List classes with pupil counts' },
    { method: 'GET', path: '/api/v1/external/attendance', description: 'Get attendance records (supports ?date, ?class_id, ?pupil_id)' },
    { method: 'GET', path: '/api/v1/external/assessments', description: 'Get assessment records (supports ?term, ?academic_year, ?class_id)' },
    { method: 'GET', path: '/api/v1/external/fees', description: 'List active fee structures' },
    { method: 'GET', path: '/api/v1/external/payments', description: 'List payments (supports ?pupil_id, ?from, ?to)' },
  ];

  // ─── PRO-ONLY LOCK SCREEN ───
  if (!isPro) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Access</h1>
          <p className="text-sm text-gray-500 mt-1">Programmatic access to your school data via REST API</p>
        </div>
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiOutlineLockClosed className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pro Plan Feature</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            API Access is available on the <span className="font-semibold text-primary-600">Pro plan</span>.
            Upgrade to generate API keys and integrate your school data with external applications, mobile apps, and custom dashboards.
          </p>
          <a
            href="/subscribe"
            className="inline-flex items-center gap-2 btn-primary px-6 py-2.5"
          >
            <HiOutlineArrowUp className="w-5 h-5" />
            Upgrade to Pro
          </a>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
            <div className="bg-gray-50 rounded-lg p-3">
              <HiOutlineKey className="w-5 h-5 text-primary-500 mb-1" />
              <p className="text-xs font-medium text-gray-700">Secure API key authentication</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <HiOutlineDatabase className="w-5 h-5 text-primary-500 mb-1" />
              <p className="text-xs font-medium text-gray-700">Access pupils, teachers, fees &amp; more</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <HiOutlineShieldCheck className="w-5 h-5 text-primary-500 mb-1" />
              <p className="text-xs font-medium text-gray-700">Rate limiting &amp; permission control</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PRO USERS: FULL API KEYS PAGE ───
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Access</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage API keys for programmatic access to your school data
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setNewKeyResult(null);
          }}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? (
            <>
              <HiOutlineX className="w-5 h-5" />
              Cancel
            </>
          ) : (
            <>
              <HiOutlinePlus className="w-5 h-5" />
              Create API Key
            </>
          )}
        </button>
      </div>

      {/* ─── NEW KEY RESULT (shown once) ─── */}
      {newKeyResult && (
        <div className="card border-2 border-emerald-300 bg-emerald-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <HiOutlineKey className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-emerald-800 mb-1">API Key Created Successfully</h3>
              <p className="text-sm text-emerald-600 mb-3">
                Copy this key now — it will <strong>not</strong> be shown again.
              </p>
              <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 p-3">
                <code className="text-sm font-mono text-gray-800 break-all flex-1">
                  {newKeyResult.raw_key || newKeyResult.key || '—'}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyResult.raw_key || newKeyResult.key || '')}
                  className="p-2 hover:bg-emerald-50 rounded-lg transition flex-shrink-0"
                  title="Copy to clipboard"
                >
                  <HiOutlineClipboardCopy className="w-5 h-5 text-emerald-600" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewKeyResult(null)}
              className="p-1 text-emerald-400 hover:text-emerald-600 transition flex-shrink-0"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── CREATE FORM ─── */}
      {showForm && (
        <form onSubmit={handleCreate} className="card border-primary-200 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <HiOutlineKey className="w-5 h-5 text-primary-500" />
            New API Key
          </h2>

          <div>
            <label className="label">Key Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder='e.g., "Mobile App", "Dashboard Integration", "Report Sync"'
              required
            />
          </div>

          <div>
            <label className="label">Permissions</label>
            <div className="flex gap-3 mt-1">
              {['read', 'write', 'delete'].map((perm) => (
                <label
                  key={perm}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    form.permissions.includes(perm)
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium capitalize">{perm}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Read permission is always required</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Rate Limit (requests/hour)</label>
              <input
                type="number"
                value={form.rate_limit}
                onChange={(e) => setForm((p) => ({ ...p, rate_limit: e.target.value }))}
                className="input-field"
                min={10}
                max={1000}
              />
            </div>
            <div>
              <label className="label">Expiration Date (optional)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty for no expiration</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      )}

      {/* ─── EXISTING KEYS ─── */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-800">Your API Keys</h2>
        {keys.length > 0 ? (
          keys.map((k) => (
            <div
              key={k.id}
              className={`card border-l-4 ${
                k.is_active === false || k.revoked
                  ? 'border-l-red-400 opacity-70'
                  : 'border-l-primary-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    k.is_active === false || k.revoked ? 'bg-red-100' : 'bg-primary-100'
                  }`}
                >
                  <HiOutlineKey
                    className={`w-5 h-5 ${
                      k.is_active === false || k.revoked ? 'text-red-600' : 'text-primary-600'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{k.name}</h3>
                    {(k.is_active === false || k.revoked) && (
                      <span className="px-2 py-0.5 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
                        Revoked
                      </span>
                    )}
                    {k.permissions && (
                      <div className="flex gap-1">
                        {(Array.isArray(k.permissions) ? k.permissions : []).map((p) => (
                          <span
                            key={p}
                            className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500 font-medium capitalize"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                    <span>Key: ****{k.key_prefix || k.key_hint || '••••'}</span>
                    <span>Rate: {k.rate_limit || 100} req/hr</span>
                    <span>Created: {formatDate(k.created_at)}</span>
                    {k.expires_at && <span>Expires: {formatDate(k.expires_at)}</span>}
                    {k.last_used_at && <span>Last used: {formatDate(k.last_used_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {k.is_active !== false && !k.revoked && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition"
                      title="Revoke key"
                    >
                      <HiOutlineBan className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                    title="Delete key permanently"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12 text-gray-400">
            <HiOutlineKey className="w-12 h-12 mx-auto mb-2" />
            <p>No API keys yet</p>
            <p className="text-xs mt-1">Click &quot;Create API Key&quot; to generate your first key</p>
          </div>
        )}
      </div>

      {/* ─── API DOCUMENTATION ─── */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <HiOutlineCode className="w-5 h-5 text-primary-500" />
          API Documentation
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Use the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">X-API-Key</code> header
          to authenticate your requests. Base URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{API_BASE}</code>
        </p>

        {/* Example */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-400 mb-2">Example Request:</p>
          <code className="text-sm text-emerald-400 font-mono break-all">
            curl -H &quot;X-API-Key: YOUR_API_KEY&quot; {API_BASE}/api/v1/external/pupils
          </code>
        </div>

        {/* Endpoints table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {endpoints.map((ep) => (
                <tr key={ep.path} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 font-mono font-medium">
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-gray-700">{ep.path}</td>
                  <td className="py-2.5 px-3 text-gray-500">{ep.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rate limit note */}
        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <HiOutlineExclamation className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <strong>Rate Limiting:</strong> Each API key has a configurable rate limit (default: 100 requests/hour).
            If exceeded, the API returns <code className="bg-amber-100 px-1 rounded text-xs font-mono">429 Too Many Requests</code>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeysPage;

