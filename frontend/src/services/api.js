import axios from 'axios';

const RENDER_DIRECT_URL = 'https://return-rescue.onrender.com';
let envBase = import.meta.env.VITE_API_BASE;
let ROOT_BASE = RENDER_DIRECT_URL;

if (envBase) {
  const clean = envBase.replace(/\/+$/, '');
  ROOT_BASE = clean.endsWith('/api') ? clean.slice(0, -4) : clean;
}

const apiClient = axios.create({
  baseURL: ROOT_BASE || undefined,
  timeout: 45000,
  headers: {
    'Accept': 'application/json',
  },
});

// Interceptor for Route/API Prefix + Tab-Scoped Token Auth + CSRF cookie
apiClient.interceptors.request.use((config) => {
  // 1. Guarantee /api prefix for all endpoints
  if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
    config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  }

  // 2. Explicitly bypass Authorization header for login & register
  // This prevents DRF from rejecting login requests with "Invalid token." when stale tokens exist in browser storage!
  const isAuthEndpoint =
    config.url &&
    (config.url.includes('/auth/login') || config.url.includes('/auth/register'));

  if (isAuthEndpoint) {
    if (config.headers) {
      delete config.headers['Authorization'];
    }
    return config;
  }

  // 3. Tab-isolated & Route-aware Token Authentication for protected endpoints
  if (typeof window !== 'undefined') {
    let token = null;
    const pathname = window.location.pathname;

    if (pathname.startsWith('/manager')) {
      token =
        sessionStorage.getItem('return_rescue_manager_token') ||
        sessionStorage.getItem('return_rescue_token') ||
        localStorage.getItem('return_rescue_manager_token') ||
        localStorage.getItem('return_rescue_token');
    } else if (pathname.startsWith('/customer')) {
      token =
        sessionStorage.getItem('return_rescue_customer_token') ||
        sessionStorage.getItem('return_rescue_token') ||
        localStorage.getItem('return_rescue_customer_token') ||
        localStorage.getItem('return_rescue_token');
    } else {
      token = sessionStorage.getItem('return_rescue_token') || localStorage.getItem('return_rescue_token');
    }

    if (token) {
      config.headers['Authorization'] = `Token ${token}`;
    }
  }

  // 2. CSRF cookie from Django if present
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };
  const csrftoken = getCookie('csrftoken');
  if (csrftoken) {
    config.headers['X-CSRFToken'] = csrftoken;
  }
  return config;
});

// Automatic dual-channel fallback: If HTML was returned or server was waking up,
// seamlessly retry directly against Render cloud backend!
apiClient.interceptors.response.use(
  (response) => {
    // If an HTML document was mistakenly returned instead of API JSON (e.g. SPA fallback)
    if (
      typeof response.data === 'string' &&
      response.data.includes('<!doctype html>') &&
      !response.config._htmlRetried
    ) {
      response.config._htmlRetried = true;
      response.config.baseURL = RENDER_DIRECT_URL;
      return apiClient(response.config);
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    if (!config || config._retried) {
      return Promise.reject(error);
    }
    const isNetworkOrServerDown =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      [502, 503, 504].includes(error.response?.status);

    // Automatic cleanup if server reports token is invalid
    if (error.response?.status === 401 && error.response?.data?.detail === 'Invalid token.') {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('return_rescue_token');
        sessionStorage.removeItem('return_rescue_user');
        sessionStorage.removeItem('return_rescue_manager_token');
        sessionStorage.removeItem('return_rescue_manager_user');
        sessionStorage.removeItem('return_rescue_customer_token');
        sessionStorage.removeItem('return_rescue_customer_user');
        localStorage.removeItem('return_rescue_token');
        localStorage.removeItem('return_rescue_user');
        localStorage.removeItem('return_rescue_manager_token');
        localStorage.removeItem('return_rescue_manager_user');
        localStorage.removeItem('return_rescue_customer_token');
        localStorage.removeItem('return_rescue_customer_user');
      }
    }

    if (isNetworkOrServerDown) {
      config._retried = true;
      config.baseURL = RENDER_DIRECT_URL;
      return apiClient(config);
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: (data) => {
    // Clear stale stored tokens before initiating a fresh login attempt
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('return_rescue_token');
      sessionStorage.removeItem('return_rescue_manager_token');
      sessionStorage.removeItem('return_rescue_customer_token');
      localStorage.removeItem('return_rescue_token');
      localStorage.removeItem('return_rescue_manager_token');
      localStorage.removeItem('return_rescue_customer_token');
    }
    return apiClient.post('/auth/login/', data);
  },
  register: (data) => apiClient.post('/auth/register/', data),
  logout: () => apiClient.post('/auth/logout/'),
  getCurrentUser: () => apiClient.get('/auth/me/'),
  updateProfile: (data) => apiClient.patch('/auth/profile/', data),

  // Metrics
  getDashboardMetrics: () => apiClient.get('/metrics/dashboard/'),

  // Categories & Catalog
  getCategories: () => apiClient.get('/categories/'),
  getCategory: (slug) => apiClient.get(`/categories/${slug}/`),
  createCategory: (data) => apiClient.post('/categories/', data),
  updateCategory: (slug, data) => apiClient.put(`/categories/${slug}/`, data),
  lookupSku: (sku) => apiClient.get(`/products/lookup_sku/?sku=${encodeURIComponent(sku)}`),
  getProducts: () => apiClient.get('/products/'),

  // Returns
  getReturns: (params) => apiClient.get('/returns/', { params }),
  getReturn: (id) => apiClient.get(`/returns/${id}/`),
  createReturn: (formData) => apiClient.post('/returns/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteReturn: (id) => apiClient.delete(`/returns/${id}/`),
  triggerAiInspection: (id) => apiClient.post(`/returns/${id}/trigger_ai_inspection/`),
  approveDecision: (id, data) => apiClient.post(`/returns/${id}/approve_decision/`, data),

  // Datasets
  getDatasets: () => apiClient.get('/datasets/'),
  seedDatasets: () => apiClient.post('/datasets/seed_registry/'),
  downloadDataset: (id) => apiClient.post(`/datasets/${id}/trigger_download/`),
  validateDataset: (id) => apiClient.post(`/datasets/${id}/validate_dataset/`),

  // Inventory & Audits
  getInventory: () => apiClient.get('/inventory/'),
  getAuditLogs: () => apiClient.get('/audit-logs/'),

  // Notifications
  getNotifications: () => apiClient.get('/notifications/'),
  markNotificationRead: (id) => apiClient.post(`/notifications/${id}/mark_as_read/`),
  markAllNotificationsRead: () => apiClient.post('/notifications/mark_all_read/'),
};

export default api;
