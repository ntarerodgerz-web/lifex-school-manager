import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineCamera } from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { put, loading } = useApi();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await put(`/users/${user.id}`, form);
      toast.success('Profile updated');
      updateUser(form);
    } catch { /* handled */ }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm) {
      return toast.error('Passwords do not match');
    }
    try {
      await put('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed. Please log in again.');
      setPasswordForm({ current_password: '', new_password: '', confirm: '' });
    } catch { /* handled */ }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Image must be under 5 MB');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await api.put('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const avatarUrl = data.data.avatar_url;
      updateUser({ avatar_url: avatarUrl });
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Avatar upload failed');
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>

      <form onSubmit={handleProfileUpdate} className="card space-y-4">
        {/* Avatar + Info */}
        <div className="flex items-center gap-5 mb-4">
          <div className="relative group">
            {user?.avatar_url ? (
              <img
                src={`${API_BASE}${user.avatar_url}`}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            )}

            {/* Camera overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <HiOutlineCamera className="w-6 h-6 text-white" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">{user?.first_name} {user?.last_name}</p>
            <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-primary-500 hover:text-primary-600 mt-1 font-medium"
            >
              {uploading ? 'Uploading...' : 'Change photo'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="label">First Name</label>
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input-field" /></div>
          <div><label className="label">Last Name</label>
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input-field" /></div>
          <div><label className="label">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
          <div><label className="label">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>

      <form onSubmit={handlePasswordChange} className="card space-y-4">
        <h3 className="font-semibold text-gray-800">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showCurrent ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="input-field pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showNew ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-accent">{loading ? 'Changing...' : 'Change Password'}</button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
