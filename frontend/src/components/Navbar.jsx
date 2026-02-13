import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useApi from '../hooks/useApi';
import { HiOutlineMenu, HiOutlineBell, HiOutlineLogout, HiOutlineUser, HiOutlineSpeakerphone, HiOutlineRefresh, HiOutlineStatusOnline, HiOutlineStatusOffline } from 'react-icons/hi';
import { getPendingSyncCount } from '../utils/offlineDb';
import { onSyncChange, processQueue, setupAutoSync } from '../utils/syncManager';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/** Play a short beep sound using Web Audio API */
const playNotificationBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 830;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    // Second tone (slightly higher, a pleasant ding-dong)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1050;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.35);
    // Clean up after sounds finish
    setTimeout(() => ctx.close(), 500);
  } catch { /* Audio not supported – silently ignore */ }
};

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { get } = useApi();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(-1);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // ── Online/Offline & Sync state ──
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Setup auto-sync on mount
    setupAutoSync();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events
    const unsubscribe = onSyncChange((event) => {
      if (event.type === 'online') setIsOnline(true);
      if (event.type === 'offline') setIsOnline(false);
      if (event.type === 'sync-start') setIsSyncing(true);
      if (event.type === 'sync-complete') {
        setIsSyncing(false);
        setPendingSync(event.remaining);
      }
      if (event.type === 'sync-item-done' || event.type === 'sync-item-failed') {
        // Update count progressively
        getPendingSyncCount().then(setPendingSync);
      }
    });

    // Check pending count on mount
    getPendingSyncCount().then(setPendingSync);
    // Refresh pending count periodically
    const interval = setInterval(() => {
      getPendingSyncCount().then(setPendingSync);
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = () => {
    if (!isOnline || isSyncing) return;
    processQueue();
  };

  // Fetch announcements + broadcasts (SUPER_ADMIN gets broadcasts only; others get both)
  const fetchNotifications = useCallback(async () => {
    try {
      let items = [];

      // School-scoped announcements (skip for SUPER_ADMIN)
      if (user?.role !== 'SUPER_ADMIN') {
        try {
          const res = await get('/announcements', { limit: 10 }, { silent: true });
          items = (res.data || []).map((n) => ({ ...n, _type: 'announcement' }));
        } catch { /* silently fail */ }
      }

      // Platform-wide broadcasts from SUPER_ADMIN
      try {
        const bRes = await get('/broadcasts', { limit: 10 }, { silent: true });
        const broadcasts = (bRes.data || []).map((b) => ({ ...b, _type: 'broadcast' }));
        items = [...broadcasts, ...items];
      } catch { /* silently fail – endpoint may not exist yet */ }

      // Sort by date descending
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotifications(items);

      // Track which ones the user has "seen" via localStorage
      const lastSeenTime = localStorage.getItem('notifications_last_seen');
      let newUnread = 0;
      if (lastSeenTime) {
        newUnread = items.filter((n) => new Date(n.created_at) > new Date(lastSeenTime)).length;
      } else {
        newUnread = items.length;
      }

      // Play beep if new notifications arrived since last check (skip first load)
      if (prevUnreadRef.current >= 0 && newUnread > prevUnreadRef.current) {
        playNotificationBeep();
      }
      prevUnreadRef.current = newUnread;
      setUnreadCount(newUnread);
    } catch { /* silently fail */ }
  }, [get, user?.role]);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBellClick = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    setDropdownOpen(false);
    if (opening) {
      // Mark all as seen
      localStorage.setItem('notifications_last_seen', new Date().toISOString());
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const timeAgo = (dateStr) => {
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
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Menu button + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <HiOutlineMenu className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-sm font-semibold text-gray-500 hidden sm:block">
          {user?.school_name || 'School Manager'}
        </h2>
      </div>

      {/* Right: connectivity, sync, notifications, profile */}
      <div className="flex items-center gap-3">
        {/* Online/Offline indicator + Sync */}
        <div className="flex items-center gap-1.5">
          {/* Connection status */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
              isOnline
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-500 animate-pulse'
            }`}
            title={isOnline ? 'Connected' : 'Offline — changes will sync when connected'}
          >
            {isOnline ? (
              <HiOutlineStatusOnline className="w-3.5 h-3.5" />
            ) : (
              <HiOutlineStatusOffline className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Pending sync badge */}
          {pendingSync > 0 && (
            <button
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
                isSyncing
                  ? 'bg-blue-50 text-blue-500'
                  : isOnline
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={isSyncing ? 'Syncing...' : isOnline ? 'Click to sync now' : 'Will sync when online'}
            >
              <HiOutlineRefresh className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingSync}</span>
            </button>
          )}
        </div>

        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition"
            title="Notifications"
          >
            <HiOutlineBell className="w-5 h-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                {notifications.length > 0 && (
                  <span className="text-xs text-gray-400">{notifications.length} recent</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={`${notif._type}-${notif.id}`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate(notif._type === 'broadcast' ? '/broadcasts' : '/announcements');
                      }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${notif._type === 'broadcast' ? 'bg-red-100' : 'bg-accent-100'}`}>
                        <HiOutlineSpeakerphone className={`w-4 h-4 ${notif._type === 'broadcast' ? 'text-red-600' : 'text-accent-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{notif.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.body || notif.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-gray-400">{timeAgo(notif.created_at)}</span>
                          {notif._type === 'broadcast' ? (
                            <span className="px-1.5 py-0.5 bg-red-50 rounded text-[10px] text-red-500 font-medium">System</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500 capitalize">{notif.audience}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <HiOutlineBell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/announcements');
                    }}
                    className="w-full text-center text-sm font-medium text-primary-500 hover:text-primary-600 transition"
                  >
                    View All Announcements →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            {user?.avatar_url ? (
              <img
                src={`${API_BASE}${user.avatar_url}`}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {user?.first_name}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
              <button
                onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <HiOutlineUser className="w-4 h-4" /> Edit Profile
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <HiOutlineLogout className="w-4 h-4" /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

