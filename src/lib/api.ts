import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const csrf = Cookies.get('csrftoken');
  if (csrf) {
    config.headers['X-CSRFToken'] = csrf;
  }
  return config;
});

export default api;
