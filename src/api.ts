// src/api.ts
import axios from 'axios';

const api = axios.create({
  // 🚨 Changed from 'localhost' to your local network IP (192.168.1.8)
  // This ensures the dashboard can fetch orders when accessed from your mobile browser.
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.8:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
