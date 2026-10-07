import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';

export type Role = 'OWNER' | 'TENANT' | 'STAFF';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string | null;
  staffType?: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { email: string; password: string; fullName: string; role: 'OWNER' | 'TENANT' }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!tokenStore.access) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data.data);
      })
      .catch(() => {
        tokenStore.clear();
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password }, { timeout: 10_000 });
    const { accessToken, refreshToken, user: u } = res.data.data;
    tokenStore.set(accessToken, refreshToken);
    setUser(u);
    return u as User;
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; fullName: string; role: 'OWNER' | 'TENANT' }) => {
      const res = await api.post('/auth/register', input);
      const { accessToken, refreshToken, user: u } = res.data.data;
      tokenStore.set(accessToken, refreshToken);
      setUser(u);
      return u as User;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      if (tokenStore.refresh) await api.post('/auth/logout', { refreshToken: tokenStore.refresh });
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
