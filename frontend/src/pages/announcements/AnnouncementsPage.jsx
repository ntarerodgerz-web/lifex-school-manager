import { useEffect, useState, useCallback } from 'react';
import useApi from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSpeakerphone } from 'react-icons/hi';

const AnnouncementsPage = () => {
  const { isAdmin } = useAuth();
  const { get, post, loading } = useApi();
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await get('/announcements', null, { silent: true });
      setAnnouncements(res.data || []);
    } catch { /* handled */ }
  }, [get]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await post('/announcements', form);
      toast.success('Announcement posted');
      setShowForm(false);
      setForm({ title: '', body: '', audience: 'all' });
      fetchAnnouncements();
    } catch { /* handled */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> Add Announcement
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card border-primary-200 bg-primary-50/30 space-y-4">
          <div>
            <label className="label">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="input-field" rows={4} required />
          </div>
          <div>
            <label className="label">Audience</label>
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="input-field w-48">
              <option value="all">Everyone</option>
              <option value="teachers">Teachers Only</option>
              <option value="parents">Parents Only</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Posting...' : 'Post Announcement'}</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {announcements.map((ann) => (
          <div key={ann.id} className="card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <HiOutlineSpeakerphone className="w-5 h-5 text-accent-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800">{ann.title}</h3>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500 capitalize">{ann.audience}</span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-line">{ann.body}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {ann.posted_by_name && `By ${ann.posted_by_name} • `}
                  {new Date(ann.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <HiOutlineSpeakerphone className="w-12 h-12 mx-auto mb-2" />
            <p>No announcements yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;

