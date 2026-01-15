import axios from 'axios';

let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const clientId = import.meta.env.VITE_CLIENT_ID;
    if (clientId) {
      config.params = config.params || {};
      config.params.clientId = clientId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
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
      message: error.response?.data?.message,
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/me')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
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
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        console.log('Token refreshed successfully');
        return api(originalRequest);
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        delete api.defaults.headers.common['Authorization'];
        unauthorizedHandler?.();
        window.location.hash = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// Tipos para respuestas de imágenes
export interface UploadImageResponse {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface RespondToContactPayload {
  message?: string;
  imageUrl?: string;
  imageKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Sube una imagen para enviar a un contacto
 */
export const uploadContactImage = async (
  contactId: string,
  file: File
): Promise<UploadImageResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post<UploadImageResponse>(
    `/dashboard/contacts/${contactId}/upload-image`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

/**
 * Envía una respuesta a un contacto (con texto y/o imagen)
 */
export const respondToContact = async (
  contactId: string,
  payload: RespondToContactPayload
) => {
  const response = await api.post(`/dashboard/contacts/${contactId}/respond`, payload);
  return response.data;
};

export default api;
