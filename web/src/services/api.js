import axios from 'axios';

const localHostnames = new Set(['localhost', '127.0.0.1']);

const defaultApiUrl = localHostnames.has(window.location.hostname)
  ? '/api'
  : 'https://api-finance-control.onrender.com/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/') {
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
