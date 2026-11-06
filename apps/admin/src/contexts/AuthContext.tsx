import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SuperadminUserDto, SuperadminLoginInput } from '@carx/shared';
import { adminApi, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: SuperadminUserDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tempToken: string | null;
  requires2FA: boolean;
  login: (credentials: SuperadminLoginInput) => Promise<{ requires2FA?: boolean }>;
  verify2FA: (code: string) => Promise<void>;
  cancel2FA: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<SuperadminUserDto | null>(() => {
    const saved = localStorage.getItem('carx_superadmin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Validar token no startup se houver
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
    }
    setIsLoading(false);

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('carx:superadmin:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('carx:superadmin:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (credentials: SuperadminLoginInput) => {
    setIsLoading(true);
    try {
      const response = await adminApi.login(credentials);
      if (response.requires2FA && response.tempToken) {
        setTempToken(response.tempToken);
        setRequires2FA(true);
        setIsLoading(false);
        return { requires2FA: true };
      }

      if (response.token && response.user) {
        setStoredToken(response.token);
        localStorage.setItem('carx_superadmin_user', JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        setRequires2FA(false);
        setTempToken(null);
        setIsLoading(false);
        return { requires2FA: false };
      }

      throw new Error('Resposta de autenticação inválida.');
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const verify2FA = async (code: string) => {
    if (!tempToken) {
      throw new Error('Sessão temporária de 2FA não encontrada.');
    }
    setIsLoading(true);
    try {
      const response = await adminApi.verify2fa(tempToken, code);
      if (response.token && response.user) {
        setStoredToken(response.token);
        localStorage.setItem('carx_superadmin_user', JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        setRequires2FA(false);
        setTempToken(null);
      } else {
        throw new Error('Falha na validação do token 2FA.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const cancel2FA = () => {
    setTempToken(null);
    setRequires2FA(false);
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
    setTempToken(null);
    setRequires2FA(false);
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        tempToken,
        requires2FA,
        login,
        verify2FA,
        cancel2FA,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}

