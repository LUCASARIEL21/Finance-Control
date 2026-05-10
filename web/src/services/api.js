import axios from 'axios';

const localHostnames = new Set(['localhost', '127.0.0.1']);

const defaultApiUrl = localHostnames.has(window.location.hostname)
  ? '/api'
  : 'https://api-finance-control.onrender.com/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
  withCredentials: true,
});

export default api;