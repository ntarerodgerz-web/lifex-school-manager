import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { saveAndApplyTheme, loadSavedTheme, removeTheme } from '../utils/themeUtils';
import { saveUserSession, getUserSession, clearUserSession, clearCache, clearSyncQueue } from '../utils/offlineDb';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Apply saved theme as early as possible (before React renders)
  useEffect(() => {
    loadSavedTheme();
  }, []);

  // Check for existing session on mount, then refresh from server
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user');

      let restoredUser = null;

      if (token && savedUser) {
        try {
          restoredUser = JSON.parse(savedUser);
        } catch {
          localStorage.clear();
        }
      }

      // Fallback: try IndexedDB if localStorage is empty (e.g. after reinstall on mobile)
      if (!restoredUser) {
        try {
          const offlineSession = await getUserSession();
          if (offlineSession?.user && offlineSession?.tokens) {
            restoredUser = offlineSession.user;
            localStorage.setItem('access_token', offlineSession.tokens.access_token);
            localStorage.setItem('refresh_token', offlineSession.tokens.refresh_token);
            localStorage.setItem('user', JSON.stringify(offlineSession.user));
          }
        } catch {
          // IndexedDB not available
        }
      }

      if (restoredUser) {
        setUser(restoredUser);

        // Refresh user data from server to keep school_name, branding etc. up to date
        try {
          const { data } = await api.get('/auth/me');
          const fresh = data.data;
          if (fresh) {
            const merged = { ...restoredUser, ...fresh };
            localStorage.setItem('user', JSON.stringify(merged));
            setUser(merged);
            if (fresh.primary_color || fresh.secondary_color || fresh.font_family || fresh.font_style) {
              saveAndApplyTheme(fresh.primary_color, fresh.secondary_color, fresh.font_family, fresh.font_style);
            }
          }
        } catch {
          // Token expired / invalid — clear stale session and force login
          if (!localStorage.getItem('access_token')) {
            setUser(null);
          }
        }
      }

      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    const { access_token, refresh_token, user: userData } = data.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));

    // Apply school branding theme on login
    if (userData.primary_color || userData.secondary_color || userData.font_family || userData.font_style) {
      saveAndApplyTheme(userData.primary_color, userData.secondary_color, userData.font_family, userData.font_style);
    } else {
      // Remove any previously saved theme (new school with no branding)
      removeTheme();
      localStorage.removeItem('school_branding');
    }

    setUser(userData);

    // Save session to IndexedDB for offline access
    saveUserSession(userData, { access_token, refresh_token });

    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    const { access_token, refresh_token, user: userData } = data.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));

    // New registration — no custom branding yet, clear any stale theme
    removeTheme();
    localStorage.removeItem('school_branding');

    setUser(userData);

    // Save session to IndexedDB for offline access
    saveUserSession(userData, { access_token, refresh_token });

    return data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.clear();
      removeTheme();
      setUser(null);

      // Clear offline data (cache + user session; keep sync queue for pending changes)
      clearUserSession();
      clearCache();
    }
  }, []);

  /**
   * Merge partial user data into state + localStorage (e.g. after avatar upload, branding change).
   */
  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN',
    isTeacher: user?.role === 'TEACHER',
    isParent: user?.role === 'PARENT',
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isPremium: ['standard', 'pro'].includes(user?.plan_type),
    planType: user?.plan_type || 'starter',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
