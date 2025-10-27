import axios from 'axios';

// ✅ En Vite las variables deben comenzar con VITE_
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Ej: http://api.18-116-178-41.nip.io/api/v1
  withCredentials: true, // Para cookies httpOnly
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Interceptor para incluir token y clientId en cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Añadimos clientId global (si aplica)
    const clientId = import.meta.env.VITE_CLIENT_ID;
    if (clientId) {
      config.params = config.params || {};
      config.params.clientId = clientId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Lógica de refresh token igual que antes
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void; }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    console.log('API Error:', {
      status: error.response?.status,
      url: originalRequest?.url,
      message: error.response?.data?.message
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/me')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('Attempting to refresh token...');
        const { data } = await api.post('/auth/refresh');
        const newAccessToken = data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        processQueue(null, newAccessToken);
        console.log('Token refreshed successfully');
        return api(originalRequest);
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        delete api.defaults.headers.common['Authorization'];
        window.location.hash = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
