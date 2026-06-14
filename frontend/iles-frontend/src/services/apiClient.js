import axios from 'axios';

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

if (API_BASE_URL && !API_BASE_URL.startsWith('http') && !API_BASE_URL.startsWith('/')) {
  API_BASE_URL = `https://${API_BASE_URL}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAppRoute = window.location.pathname.startsWith('/app');

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken
          });

          const { access } = response.data;
          localStorage.setItem('accessToken', access);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token is invalid, logout user
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          if (isAppRoute) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token. Keep public pages accessible without forced redirect.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (isAppRoute) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;