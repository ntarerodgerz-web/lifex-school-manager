import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Subscription error codes returned by subscriptionGuard ──
const SUBSCRIPTION_ERROR_CODES = [
  'TRIAL_EXPIRED',
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_SUSPENDED',
];

// Request interceptor: attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh + subscription blocks
api.interceptors.response.use(
  (response) => {
    // Capture subscription / trial days-left from custom headers
    const trialDays = response.headers['x-trial-days-left'];
    const subDays = response.headers['x-subscription-days-left'];
    const graceDays = response.headers['x-grace-days-left'];

    if (trialDays !== undefined) sessionStorage.setItem('trial_days_left', trialDays);
    if (subDays !== undefined) sessionStorage.setItem('subscription_days_left', subDays);
    if (graceDays !== undefined) sessionStorage.setItem('grace_days_left', graceDays);

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // ── Handle subscription / trial expired (403 with known codes) ──
    if (error.response?.status === 403) {
      const code = error.response.data?.code;
      if (SUBSCRIPTION_ERROR_CODES.includes(code)) {
        // Store the code so the paywall can show the right message
        sessionStorage.setItem('subscription_block', code);
        // Navigate to subscription-expired page (avoid infinite redirect loops)
        // Also allow /subscribe page so users can actually pay
        const path = window.location.pathname;
        if (!path.includes('/subscription-expired') && !path.includes('/subscribe') && !path.includes('/payment')) {
          window.location.href = '/subscription-expired';
        }
        return Promise.reject(error);
      }
      // Plan limit reached — let the toast show but don't redirect
      if (code === 'PLAN_LIMIT_REACHED') {
        // Toast will be shown by the useApi hook; just reject
        return Promise.reject(error);
      }
    }

    // ── Handle 401 token expired → attempt refresh ──
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.replace('/login');
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem('access_token', data.data.access_token);
        localStorage.setItem('refresh_token', data.data.refresh_token);

        originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        // Only redirect if not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.replace('/login');
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

