import axios from 'axios';

let envBase = import.meta.env.VITE_API_BASE;
let ROOT_BASE = '';

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

  // 4. CSRF cookie from Django if present
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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Clean up stale tokens if server reports token is invalid on a protected route
    if (error.response?.status === 401 && error.response?.data?.detail === 'Invalid token.') {
      if (typeof window !== 'undefined') {
        const keys = [
          'return_rescue_token',
          'return_rescue_user',
          'return_rescue_manager_token',
          'return_rescue_manager_user',
          'return_rescue_customer_token',
          'return_rescue_customer_user',
        ];
        keys.forEach((k) => {
          sessionStorage.removeItem(k);
          localStorage.removeItem(k);
        });
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: (data) => {
    // Clear stale stored tokens before initiating a fresh login attempt
    if (typeof window !== 'undefined') {
      const keys = [
        'return_rescue_token',
        'return_rescue_user',
        'return_rescue_customer_token',
        'return_rescue_customer_user',
        'return_rescue_manager_token',
        'return_rescue_manager_user',
      ];
      keys.forEach((k) => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
    }
    return apiClient.post('/auth/login/', data);
  },
  register: (data) => {
    // Clear stale stored tokens before initiating a fresh registration
    if (typeof window !== 'undefined') {
      const keys = [
        'return_rescue_token',
        'return_rescue_user',
        'return_rescue_customer_token',
        'return_rescue_customer_user',
        'return_rescue_manager_token',
        'return_rescue_manager_user',
      ];
      keys.forEach((k) => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
    }
    return apiClient.post('/auth/register/', data);
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      const keys = [
        'return_rescue_token',
        'return_rescue_user',
        'return_rescue_customer_token',
        'return_rescue_customer_user',
        'return_rescue_manager_token',
        'return_rescue_manager_user',
      ];
      keys.forEach((k) => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
    }
    return apiClient.post('/auth/logout/');
  },
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

  // Customers (Manager)
  getCustomers: (params) => apiClient.get('/customers/', { params }),
  toggleCustomerStatus: (id) => apiClient.post(`/customers/${id}/toggle-status/`),

  // Notifications
  getNotifications: () => apiClient.get('/notifications/'),
  markNotificationRead: (id) => apiClient.post(`/notifications/${id}/mark_as_read/`),
  markAllNotificationsRead: () => apiClient.post('/notifications/mark_all_read/'),
};

export default api;
