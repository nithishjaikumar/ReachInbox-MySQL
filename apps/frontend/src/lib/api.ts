import axios from 'axios';

// In Next.js with rewrites configured, requests to '/api/...' go through the Next.js same-origin proxy.
// If NEXT_PUBLIC_API_URL is explicitly set (e.g. to 'http://localhost:4000'), use it as baseURL,
// stripping any trailing slashes or '/api' suffix so we never construct duplicate '/api/api/...'.
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const baseURL = rawBaseUrl
  ? rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  : '';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
