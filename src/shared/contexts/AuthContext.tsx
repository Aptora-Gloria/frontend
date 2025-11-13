import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

import { getCurrentUser } from '@/shared/lib/auth-api';
import type { GitHubUserDto } from '@/shared/lib/auth-api';
import { STORAGE_KEYS, IS_DEVELOPMENT } from '@/shared/lib/constants';

interface AuthContextType {
  user: GitHubUserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<GitHubUserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Only logout if it's a 401 (unauthorized), not network errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          setUser(null);
        } else {
          // For other errors (network, 500, etc.), keep token but set user to null
          setUser(null);
        }
      } else {
        // Network error or unknown error - keep token, set user to null
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (token: string) => {
    if (IS_DEVELOPMENT) {
      console.log('Setting JWT token in localStorage:', token);
    }
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    await refreshUser();
  }, [refreshUser]);

  // Sadece ilk mount'ta refreshUser çağır - sürekli döngüye girmesin
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        // Token yoksa direkt loading'i false yap, API çağrısı yapma
        setUser(null);
        setIsLoading(false);
        return;
      }
      // Token varsa kullanıcı bilgisini çek
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // refreshUser useCallback ile wrap edildiği için stable, ama ESLint uyarısını önlemek için boş array

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
