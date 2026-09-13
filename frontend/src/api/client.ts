import axios from 'axios';
import { storage } from '../utils/storage';

// Default production backend API endpoint
export const DEFAULT_API_URL = 'https://myday-evin.onrender.com/api/v1';

export const getDefaultHost = () => {
  return DEFAULT_API_URL;
};

export let API_BASE_URL = DEFAULT_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Initialize base URL from AsyncStorage or default to production Render URL
export async function initApiClientBaseUrl(): Promise<string> {
  const savedUrl = await storage.getApiBaseUrl();
  // If stored URL is an old local dev IP or empty, reset to default production Render URL
  if (
    savedUrl &&
    !savedUrl.includes('10.') &&
    !savedUrl.includes('192.168.') &&
    !savedUrl.includes('localhost') &&
    !savedUrl.includes('127.0.0.1')
  ) {
    API_BASE_URL = savedUrl;
    apiClient.defaults.baseURL = savedUrl;
  } else {
    API_BASE_URL = DEFAULT_API_URL;
    apiClient.defaults.baseURL = DEFAULT_API_URL;
    await storage.setApiBaseUrl(DEFAULT_API_URL);
  }
  return API_BASE_URL;
}

export function updateApiClientBaseUrl(newUrl: string) {
  let formatted = newUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `http://${formatted}`;
  }
  if (!formatted.endsWith('/api/v1')) {
    formatted = formatted.endsWith('/') ? `${formatted}api/v1` : `${formatted}/api/v1`;
  }
  API_BASE_URL = formatted;
  apiClient.defaults.baseURL = formatted;
  storage.setApiBaseUrl(formatted);
}

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to format errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    let message = 'An unexpected error occurred';
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        message = error.response.data.detail;
      } else if (Array.isArray(error.response.data.detail)) {
        message = error.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      }
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);
