import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        // Refresh token is in HttpOnly cookie — no body needed
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        useAuthStore.getState().setTokens(data.token);
        error.config.headers.Authorization = `Bearer ${data.token}`;
        return axios(error.config);
      } catch {
        useAuthStore.getState().logout();
      }
    } else if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
