import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { UserResult, ProfileMiniResult } from '../types/api';
import * as authApi from '../api/auth';
import { getMiniProfile } from '../api/profile';
import { ApiError } from '../api/client';

interface AuthContextType {
  user: UserResult | null;
  miniProfile: ProfileMiniResult | null;
  hasClub: boolean;
  loading: boolean;
  login: (loginStr: string, password: string) => Promise<void>;
  register: (loginStr: string, password: string, name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMiniProfile: () => Promise<void>;
  setUserEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResult | null>(null);
  const [miniProfile, setMiniProfile] = useState<ProfileMiniResult | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMiniProfile = useCallback(async () => {
    try {
      const profile = await getMiniProfile();
      setMiniProfile(profile);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tryLoad = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const [me, profile] = await Promise.all([authApi.getMe(), getMiniProfile()]);
          if (!cancelled) {
            setUser(me);
            setMiniProfile(profile);
          }
          return;
        } catch (e: unknown) {
          const isServerError = e instanceof ApiError && e.status >= 500;
          const isNetworkError = !(e instanceof ApiError);
          if ((isServerError || isNetworkError) && i < retries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            continue;
          }
          if (!cancelled) setUser(null);
          return;
        }
      }
    };
    tryLoad().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const login = async (loginStr: string, password: string) => {
    const result = await authApi.login({ login: loginStr, password });
    setUser(result);
    await refreshMiniProfile();
  };

  const register = async (loginStr: string, password: string, name: string, email: string) => {
    const result = await authApi.register({ login: loginStr, password, name, email });
    setUser(result);
    await refreshMiniProfile();
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setMiniProfile(null);
  };

  const setUserEmail = async (email: string) => {
    await authApi.setEmail(email);
    setUser(prev => prev ? { ...prev, hasEmail: true } : prev);
  };

  const hasClub = miniProfile?.clubId != null;

  return (
    <AuthContext.Provider value={{ user, miniProfile, hasClub, loading, login, register, logout, refreshMiniProfile, setUserEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
