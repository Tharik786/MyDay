import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@myday_auth_token';
const USER_KEY = '@myday_auth_user';
const API_URL_KEY = '@myday_api_base_url';
const NOTIF_MAP_KEY = '@myday_notification_mapping';

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  async getUser(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },

  async getApiBaseUrl(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(API_URL_KEY);
    } catch {
      return null;
    }
  },

  async setApiBaseUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(API_URL_KEY, url);
  },

  async getNotificationMap(): Promise<Record<number, any>> {
    try {
      const raw = await AsyncStorage.getItem(NOTIF_MAP_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  async setNotificationMap(map: Record<number, any>): Promise<void> {
    await AsyncStorage.setItem(NOTIF_MAP_KEY, JSON.stringify(map));
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }
};
