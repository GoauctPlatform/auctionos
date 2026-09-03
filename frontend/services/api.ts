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

// Track if a refresh is in progress to avoid infinite loops
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Try to refresh the token once
      if (!isRefreshing) {
        isRefreshing = true;
        originalRequest._retry = true;

        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const res = await axios.post(`${API_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });
            const newToken = res.data.access_token;
            localStorage.setItem('token', newToken);

            // Retry all pending requests with the new token
            pendingRequests.forEach((cb) => cb(newToken));
            pendingRequests = [];
            isRefreshing = false;

            // Retry the original request
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch {
            // Refresh failed — force logout
            isRefreshing = false;
            pendingRequests = [];
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/#/';
          }
        } else {
          // No refresh token — force logout
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/#/';
        }
      } else {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
    } else if (error.response?.status === 402) {
      console.warn('Payment required or trial expired.');
      localStorage.setItem('trial_expired', 'true');
      // Don't log them out, just alert and redirect to billing
      alert(error.response?.data?.detail || "Your plan has expired or limits reached. Please upgrade.");
      window.location.href = '/#/client/expired';
    }
    return Promise.reject(error);
  }
);

export default api;
