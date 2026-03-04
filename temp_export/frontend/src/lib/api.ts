import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true, // Important for cookies
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh') &&
            !originalRequest.url?.includes('/auth/login')
        ) {
            originalRequest._retry = true;
            try {
                const { data } = await api.post('/auth/refresh');
                useAuthStore.getState().setAccessToken(data.access_token);
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
