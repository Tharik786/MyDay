import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// Production hosted Render backend API
const getDefaultHost = () => {
  return 'https://myday-evin.onrender.com/api/v1';
};

export let API_BASE_URL = getDefaultHost();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Initialize base URL from AsyncStorage if custom exists
export async function initApiClientBaseUrl(): Promise<string> {
  const savedUrl = await storage.getApiBaseUrl();
  if (savedUrl) {
    API_BASE_URL = savedUrl;
    apiClient.defaults.baseURL = savedUrl;
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
