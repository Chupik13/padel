import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { UserResult, ProfileMiniResult } from '../types/api';
import * as authApi from '../api/auth';
import { getMiniProfile } from '../api/profile';

interface AuthContextType {
  user: UserResult | null;
  miniProfile: ProfileMiniResult | null;
  loading: boolean;
  login: (loginStr: string, password: string) => Promise<void>;
  register: (loginStr: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMiniProfile: () => Promise<void>;
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
    Promise.all([authApi.getMe(), getMiniProfile()])
      .then(([me, profile]) => {
        setUser(me);
        setMiniProfile(profile);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (loginStr: string, password: string) => {
    const result = await authApi.login({ login: loginStr, password });
    setUser(result);
    await refreshMiniProfile();
  };

  const register = async (loginStr: string, password: string, name: string) => {
    const result = await authApi.register({ login: loginStr, password, name });
    setUser(result);
    await refreshMiniProfile();
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setMiniProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, miniProfile, loading, login, register, logout, refreshMiniProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
