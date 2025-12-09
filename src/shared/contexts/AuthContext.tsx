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

      // 401 ise token gerçekten geçersiz → cleanup
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };

        if (axiosError.response?.status === 401) {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          setUser(null);
        } else {
          // Network / 500 gibi durumlarda token'ı koru ama kullanıcıyı null yap
          setUser(null);
        }
      } else {
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
        setUser(null);
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
