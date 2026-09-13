import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi, LoginPayload, RegisterPayload } from '../api/auth';
import { storage } from '../utils/storage';
import { initApiClientBaseUrl } from '../api/client';
import { notificationManager } from '../notifications/notificationManager';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: { full_name?: string; timezone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 1500);

    const bootstrap = async () => {
      try {
        await initApiClientBaseUrl();
        notificationManager.init().catch(console.warn);

        const storedToken = await storage.getToken();
        const storedUser = await storage.getUser();

        if (storedToken && storedUser && isMounted) {
          // Ensure default timezone is India (Asia/Kolkata)
          if (!storedUser.timezone || storedUser.timezone === 'America/Toronto' || storedUser.timezone === 'UTC') {
            storedUser.timezone = DEFAULT_TIMEZONE;
            await storage.setUser(storedUser);
          }

          setToken(storedToken);
          setUser(storedUser);

          // Refresh user profile asynchronously without blocking initial render
          authApi.getMe().then((freshUser) => {
            if (isMounted) {
              if (!freshUser.timezone || freshUser.timezone === 'America/Toronto' || freshUser.timezone === 'UTC') {
                freshUser.timezone = DEFAULT_TIMEZONE;
                authApi.updateProfile({ timezone: DEFAULT_TIMEZONE }).catch(() => {});
              }
              setUser(freshUser);
              storage.setUser(freshUser);
            }
          }).catch(() => {
            // Token invalid or expired
            storage.clearAuth();
            if (isMounted) {
              setToken(null);
              setUser(null);
            }
          });
        }
      } catch (err) {
        console.warn('Bootstrap error:', err);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(payload);
      if (!data.user.timezone || data.user.timezone === 'America/Toronto' || data.user.timezone === 'UTC') {
        data.user.timezone = DEFAULT_TIMEZONE;
        authApi.updateProfile({ timezone: DEFAULT_TIMEZONE }).catch(() => {});
      }
      setToken(data.access_token);
      setUser(data.user);
      await storage.setToken(data.access_token);
      await storage.setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      if (!payload.timezone || payload.timezone === 'America/Toronto' || payload.timezone === 'UTC') {
        payload.timezone = DEFAULT_TIMEZONE;
      }
      const data = await authApi.register(payload);
      setToken(data.access_token);
      setUser(data.user);
      await storage.setToken(data.access_token);
      await storage.setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await storage.clearAuth();
  };

  const updateUser = async (data: { full_name?: string; timezone?: string }) => {
    const updated = await authApi.updateProfile(data);
    setUser(updated);
    await storage.setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
