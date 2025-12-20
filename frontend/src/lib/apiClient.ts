import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000',
  withCredentials: true,
});

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    let csrf = getCookie('csrfToken');
    if (!csrf) {
      try {
        await axios.get((config.baseURL || '') + '/auth/csrf', { withCredentials: true });
        csrf = getCookie('csrfToken');
      } catch (_e) {
        // fall through; server will reject if missing
      }
    }
    if (csrf) {
      config.headers = config.headers || {};
      (config.headers as any)['x-csrf-token'] = csrf;
    }
  }
  return config;
});

export default api;


