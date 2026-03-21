import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((data) => {
    setUser(data.user || data);
    setTrialExpired(data.trialExpired || false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => applyAuth({ user: data, trialExpired: data.trialExpired }))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [applyAuth]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    applyAuth(data);
    return data;
  };

  const register = async (orgName, name, email, password) => {
    const { data } = await api.post('/auth/register', { orgName, name, email, password });
    localStorage.setItem('token', data.token);
    applyAuth(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setTrialExpired(false);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      applyAuth({ user: data, trialExpired: data.trialExpired });
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, trialExpired, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
