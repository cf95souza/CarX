import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  api,
  getStoredToken,
  setStoredToken,
  setStoredRefreshToken,
  getStoredTenantId,
  setStoredTenantId,
  getStoredTenantSlug,
  setStoredTenantSlug,
  clearStoredAuth,
  ApiMembership,
  ApiAuthUser,
} from '../services/api';

export type MembershipInfo = ApiMembership;
export type AuthUser = ApiAuthUser;

export interface LegacyProfile {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  status: string;
  avatar_url?: string;
  tenant_id?: string;
}

export interface SignInResult {
  requires2fa: boolean;
  tempToken?: string;
  user?: AuthUser;
  role?: string;
  memberships?: MembershipInfo[];
}

interface AuthContextType {
  user: AuthUser | null;
  profile: LegacyProfile | null;
  memberships: MembershipInfo[];
  activeMembership: MembershipInfo | null;
  role: string;
  loading: boolean;
  temp2faToken: string | null;
  signIn: (email: string, password: string, tenantSlug?: string) => Promise<SignInResult>;
  verify2fa: (totpCode: string) => Promise<{ user: AuthUser; role: string; memberships: MembershipInfo[] }>;
  cancel2fa: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
  isOperador: boolean;
  isGestor: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const STORED_USER_KEY = 'carx_user_cached';
const STORED_MEMBERSHIPS_KEY = 'carx_memberships_cached';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORED_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [memberships, setMemberships] = useState<MembershipInfo[]>(() => {
    try {
      const raw = localStorage.getItem(STORED_MEMBERSHIPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => getStoredTenantId());
  const [loading, setLoading] = useState<boolean>(true);
  const [temp2faToken, setTemp2faToken] = useState<string | null>(null);

  const activeMembership = useMemo(() => {
    if (!memberships || memberships.length === 0) return null;
    if (activeTenantId) {
      const found = memberships.find((m) => m.tenant_id === activeTenantId);
      if (found) return found;
    }
    return memberships[0];
  }, [memberships, activeTenantId]);

  const role = useMemo(() => {
    return activeMembership?.role || '';
  }, [activeMembership]);

  // Adaptador de perfil para compatibilidade estrita com o legado OsSystem
  const profile = useMemo<LegacyProfile | null>(() => {
    if (!user) return null;
    return {
      id: user.id,
      nome: user.name || user.email.split('@')[0],
      email: user.email,
      cargo: role,
      status: 'ativo',
      tenant_id: activeMembership?.tenant_id,
    };
  }, [user, role, activeMembership]);

  // Persistir cache de usuário e memberships
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORED_USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (memberships && memberships.length > 0) {
      localStorage.setItem(STORED_MEMBERSHIPS_KEY, JSON.stringify(memberships));
    } else {
      localStorage.removeItem(STORED_MEMBERSHIPS_KEY);
    }
  }, [memberships]);

  // Inicialização de sessão com validação do token
  const initAuth = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setMemberships([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.auth.getMe();
      if (res && res.user) {
        setUser({
          id: res.user.sub,
          email: res.user.email || '',
          name: res.user.email?.split('@')[0] || 'Usuário CarX',
        });

        // Se o JWT contiver tenant e role mas a lista estiver vazia, cria membership sintética
        if (res.user.tenantId && memberships.length === 0) {
          const synthMembership: MembershipInfo = {
            tenant_id: res.user.tenantId,
            tenant_slug: getStoredTenantSlug() || '',
            tenant_name: 'Minha Oficina',
            role: res.user.role || 'gestor',
            is_active: true,
          };
          setMemberships([synthMembership]);
          setActiveTenantId(res.user.tenantId);
        }
      }
    } catch (err) {
      console.warn('Sessão expirada ou inválida:', err);
      clearStoredAuth();
      localStorage.removeItem(STORED_USER_KEY);
      localStorage.removeItem(STORED_MEMBERSHIPS_KEY);
      setUser(null);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [memberships.length]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Login com e-mail e senha
  const signIn = async (email: string, password: string, tenantSlug?: string): Promise<SignInResult> => {
    setLoading(true);
    try {
      const res = await api.auth.login({
        email: email.trim().toLowerCase(),
        password,
        tenantSlug: tenantSlug?.trim().toLowerCase(),
      });

      if (res.requires2fa) {
        setTemp2faToken(res.tempToken);
        setLoading(false);
        return {
          requires2fa: true,
          tempToken: res.tempToken,
          user: res.user,
        };
      }

      // Sessão completa concedida
      if (res.tokens) {
        setStoredToken(res.tokens.accessToken);
        setStoredRefreshToken(res.tokens.refreshToken);
      }

      setUser(res.user);
      const mems = res.memberships || [];
      setMemberships(mems);

      const firstMem = mems[0];
      if (firstMem) {
        setStoredTenantId(firstMem.tenant_id);
        setStoredTenantSlug(firstMem.tenant_slug);
        setActiveTenantId(firstMem.tenant_id);
      }

      setTemp2faToken(null);
      return {
        requires2fa: false,
        user: res.user,
        role: firstMem?.role,
        memberships: mems,
      };
    } finally {
      setLoading(false);
    }
  };

  // Verificação de 2FA TOTP
  const verify2fa = async (totpCode: string) => {
    if (!temp2faToken) {
      throw new Error('Nenhum desafio 2FA pendente.');
    }

    setLoading(true);
    try {
      const res = await api.auth.verify2fa({
        tempToken: temp2faToken,
        totpCode: totpCode.trim(),
      });

      setStoredToken(res.tokens.accessToken);
      setStoredRefreshToken(res.tokens.refreshToken);

      setUser(res.user);
      const mems = res.memberships || [];
      setMemberships(mems);

      const firstMem = mems[0];
      if (firstMem) {
        setStoredTenantId(firstMem.tenant_id);
        setStoredTenantSlug(firstMem.tenant_slug);
        setActiveTenantId(firstMem.tenant_id);
      }

      setTemp2faToken(null);
      return {
        user: res.user,
        role: firstMem?.role || '',
        memberships: mems,
      };
    } finally {
      setLoading(false);
    }
  };

  const cancel2fa = () => {
    setTemp2faToken(null);
  };

  const signOut = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('Erro ao encerrar sessão no servidor:', err);
    } finally {
      clearStoredAuth();
      localStorage.removeItem(STORED_USER_KEY);
      localStorage.removeItem(STORED_MEMBERSHIPS_KEY);
      setUser(null);
      setMemberships([]);
      setActiveTenantId(null);
      setTemp2faToken(null);
      setLoading(false);
      window.location.href = '/login';
    }
  };

  const refreshProfile = async () => {
    await initAuth();
  };

  const switchTenant = (tenantId: string) => {
    const target = memberships.find((m) => m.tenant_id === tenantId);
    if (target) {
      setActiveTenantId(target.tenant_id);
      setStoredTenantId(target.tenant_id);
      setStoredTenantSlug(target.tenant_slug);
    }
  };

  // Checagens de perfil em conformidade com as roles do CarX
  const roleUpper = (role || '').toUpperCase();
  const isOperador = roleUpper === 'TECNICO' || roleUpper === 'OPERADOR';
  const isGestor = ['OWNER', 'GESTOR', 'ADM', 'ADMIN'].includes(roleUpper);
  const isAdmin = ['OWNER', 'ADM', 'ADMIN'].includes(roleUpper);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        memberships,
        activeMembership,
        role,
        loading,
        temp2faToken,
        signIn,
        verify2fa,
        cancel2fa,
        signOut,
        refreshProfile,
        switchTenant,
        isOperador,
        isGestor,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
