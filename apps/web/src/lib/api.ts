import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Tambahkan CSRF header jika metode mengubah data
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['X-CentroAbsen-Client'] = 'true'; // Atau sesuaikan dengan backend CSRF guard
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Cek jika error 401 dan belum pernah dicoba di-retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Panggil endpoint refresh token
        await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
        // Jika sukses, coba request original lagi
        return api(originalRequest);
      } catch (refreshError) {
        // Jika gagal refresh token, redirect ke login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
