import axios from 'axios';

let envBase = import.meta.env.VITE_API_BASE;
let API_BASE = '/api';
if (envBase) {
  const cleanBase = envBase.replace(/\/+$/, '');
  API_BASE = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
}

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
  },
});

// Interceptor for Tab-Scoped Token Auth + CSRF cookie
apiClient.interceptors.request.use((config) => {
  // 1. Tab-isolated & Route-aware Token Authentication
  if (typeof window !== 'undefined') {
    let token = null;
    const pathname = window.location.pathname;

    if (pathname.startsWith('/manager')) {
      token = sessionStorage.getItem('return_rescue_manager_token') || sessionStorage.getItem('return_rescue_token');
    } else if (pathname.startsWith('/customer')) {
      token = sessionStorage.getItem('return_rescue_customer_token') || sessionStorage.getItem('return_rescue_token');
    } else {
      token = sessionStorage.getItem('return_rescue_token');
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

export const api = {
  // Auth
  login: (data) => apiClient.post('/auth/login/', data),
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
