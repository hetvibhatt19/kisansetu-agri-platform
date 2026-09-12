import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

interface User { id: string; name: string; role: string; location: string; district: string; }
interface AuthCtx { user: User | null; token: string | null; login: (phone: string, password: string) => Promise<void>; demoLogin: (role: string) => Promise<void>; logout: () => void; }

const AuthContext = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await api.post('/auth/login', { phone, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  };

  const demoLogin = async (role: string) => {
    const res = await api.post('/auth/demo-login', { role });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  };

  const logout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem('token'); localStorage.removeItem('user');
  };

  return <AuthContext.Provider value={{ user, token, login, demoLogin, logout }}>{children}</AuthContext.Provider>;
}
