// src/shared/components/ProtectedRoute.tsx
import type { ReactElement, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';

type ProtectedRouteProps = {
  children: ReactElement | ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Loading state - kullanıcı bilgisi yüklenene kadar bekle
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // isAuthenticated kullan çünkü bu user !== null kontrolü yapıyor
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

// Hem named hem default export olsun ki her iki import stili de çalışsın
export default ProtectedRoute;
