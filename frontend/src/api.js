import axios from 'axios';

// CHANGES ////////////////////////////////////////
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000/api/'                   // Local Backend
  : 'https://KanishkNegi.pythonanywhere.com/api/'; // Cloud Backend (UPDATE THIS!)

const api = axios.create({
  // baseURL: 'http://127.0.0.1:8000/api/',
  baseURL: BASE_URL,
});

//////////////////////////////////////////////////////

// Interceptor: Automatically add the Token to every request if we have it
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;