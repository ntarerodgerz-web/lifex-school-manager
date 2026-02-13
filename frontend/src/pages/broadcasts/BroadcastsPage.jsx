import { useEffect, useState, useCallback } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus, HiOutlineSpeakerphone, HiOutlineTrash,
  HiOutlineGlobeAlt, HiOutlineX,
} from 'react-icons/hi';

const BroadcastsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { get, post, del, loading } = useApi();

  const [broadcasts, setBroadcasts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [targetSchoolId, setTargetSchoolId] = useState('');
  const [schools, setSchools] = useState([]);

  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await get('/broadcasts', { limit: 50 }, { silent: true });
      if (res && res.data) {
        setBroadcasts(res.data);
      }
    } catch { /* handled by useApi */ }
  }, [get]);

  const fetchSchools = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await get('/schools', { limit: 200 }, { silent: true });
      if (res && res.data) {
        setSchools(Array.isArray(res.data) ? res.data : []);
      }
    } catch { /* handled by useApi */ }
  }, [get, isSuperAdmin]);

  useEffect(() => {
    fetchBroadcasts();
    fetchSchools();
  }, [fetchBroadcasts, fetchSchools]);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setTarget('all');
    setTargetSchoolId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { title, message, target };
      if (targetSchoolId) payload.target_school_id = targetSchoolId;
      await post('/broadcasts', payload);
      toast.success('Broadcast sent to users!');
      setShowForm(false);
      resetForm();
      fetchBroadcasts();
    } catch { /* handled by useApi */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this broadcast?')) return;
    try {
      await del(`/broadcasts/${id}`);
      toast.success('Broadcast removed');
      fetchBroadcasts();
    } catch { /* handled by useApi */ }
  };

  const targetLabel = (t) => {
    if (t === 'all') return 'Everyone';
    if (t === 'school_admins') return 'School Admins';
    if (t === 'teachers') return 'All Teachers';
    if (t === 'parents') return 'All Parents';
    return t || 'Everyone';
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin ? 'Send system-wide messages to all schools and users' : 'System messages from the platform'}
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
            className="btn-primary flex items-center gap-2"
          >
            {showForm ? <HiOutlineX className="w-5 h-5" /> : <HiOutlinePlus className="w-5 h-5" />}
            {showForm ? 'Cancel' : 'New Broadcast'}
          </button>
        )}
      </div>

      {/* Compose form (SUPER_ADMIN only) */}
      {showForm && isSuperAdmin && (
        <form onSubmit={handleSubmit} className="card border-red-200 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <HiOutlineGlobeAlt className="w-5 h-5 text-red-500" />
            Compose Broadcast
          </h2>

          <div>
            <label className="label">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g., System Maintenance Notice"
              required
            />
          </div>

          <div>
            <label className="label">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-field"
              rows={4}
              placeholder="Write your message here..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Target Audience</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="input-field"
              >
                <option value="all">Everyone (All Users)</option>
                <option value="school_admins">School Admins Only</option>
                <option value="teachers">All Teachers</option>
                <option value="parents">All Parents</option>
              </select>
            </div>

            <div>
              <label className="label">Specific School (optional)</label>
              <select
                value={targetSchoolId}
                onChange={(e) => setTargetSchoolId(e.target.value)}
                className="input-field"
              >
                <option value="">All Schools</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Leave empty to send to all schools</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </form>
      )}

      {/* Broadcasts list */}
      <div className="space-y-3">
        {broadcasts.length > 0 ? broadcasts.map((b) => (
          <div key={b.id} className="card border-l-4 border-l-red-400">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <HiOutlineGlobeAlt className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-800">{b.title}</h3>
                  <span className="px-2 py-0.5 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
                    {targetLabel(b.target)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-line">{b.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">
                    {b.posted_by_name ? `By ${b.posted_by_name} • ` : ''}
                    {timeAgo(b.created_at)}
                  </span>
                </div>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition flex-shrink-0"
                  title="Remove broadcast"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="card text-center py-12 text-gray-400">
            <HiOutlineSpeakerphone className="w-12 h-12 mx-auto mb-2" />
            <p>No broadcasts yet</p>
            {isSuperAdmin && <p className="text-xs mt-1">Click &quot;New Broadcast&quot; to send a message to all users</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastsPage;
