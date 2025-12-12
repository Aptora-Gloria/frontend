// src/shared/contexts/AuthContext.tsx

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

import { getCurrentUser } from '@/shared/lib/auth-api';
import type { GitHubUserDto } from '@/shared/lib/auth-api';
import { STORAGE_KEYS, IS_DEVELOPMENT } from '@/shared/lib/constants';
import type { AppError } from '@/shared/errors';

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

  /* -------------------------------
     LOGOUT — BEST PRACTICE VERSION
  -------------------------------- */
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      setUser(null);
      setIsLoading(false); // UI'nın loading moduna girmemesini sağlar
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, []);

  /* ---------------------------------------
     REFRESH USER — VALIDATION + EDGE SAFETY
  ---------------------------------------- */
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
      console.error("Failed to fetch user:", error);

      // AppError tipinde ise status kontrolü yap
      const appError = error as AppError;
      
      if (appError.status === 401) {
        // Token geçersiz → cleanup
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        setUser(null);
      } else {
        // Network / 500 gibi durumlarda token'ı koru ama kullanıcıyı null yap
        setUser(null);
      }

    } finally {
      setIsLoading(false);
    }
  }, []);

  /* -----------------------------
     LOGIN — TOKEN + REFRESH USER
  ------------------------------ */
  const login = useCallback(
    async (token: string) => {
      if (IS_DEVELOPMENT) {
        console.log("Setting JWT token:", token);
      }

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

      try {
        await refreshUser();
      } catch (err) {
        console.error("Login failed:", err);
        const appError = err as AppError;
        
        // Login başarısız ise token'ı temizle
        if (appError.status === 401 || appError.status === 403) {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        }
        
        setUser(null);
        throw err; // Re-throw to let caller handle
      }
    },
    [refreshUser],
  );

  /* ----------------------------------
     INITIAL MOUNT — AUTOSTART SESSION
  ----------------------------------- */
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;

      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      refreshUser();
    }
  }, [refreshUser]);

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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
