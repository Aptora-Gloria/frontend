// src/shared/components/ProtectedRoute.tsx
import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";

type ProtectedRouteProps = {
  children?: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Eski kullanım: <ProtectedRoute><DashboardPage /></ProtectedRoute>
  if (children) return <>{children}</>;

  // Yeni kullanım: nested route + Outlet
  return <Outlet />;
}
