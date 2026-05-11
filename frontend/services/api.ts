import axios from 'axios';
import { API_URL } from './httpClient';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Authentication token expired or invalid. Redirecting to login.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/#/';
    } else if (error.response?.status === 402) {
      console.warn('Payment required or trial expired.');
      // Don't log them out, just alert and redirect to billing
      alert(error.response?.data?.detail || "Your plan has expired or limits reached. Please upgrade.");
      window.location.href = '/#/client/billing';
    }
    return Promise.reject(error);
  }
);

export default api;
