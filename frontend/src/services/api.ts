// frontend/src/services/api.ts
import axios from 'axios';

// Base URL for static files
export const API_BASE_URL = 'http://localhost:8000';

// --- Add functions to handle token storage ---
const TOKEN_KEY = 'accessToken'; // Key for local storage

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAccessToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};
// --- End token storage functions ---


// API instance configuration
const api = axios.create({
  baseURL: '/api',
  // withCredentials: true, // <-- REMOVE THIS LINE
});

// --- Add Request interceptor for Authorization header ---
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// --- End interceptor ---


export default api;