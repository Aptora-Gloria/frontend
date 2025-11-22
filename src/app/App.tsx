// src/app/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import ProtectedRoute from "@/shared/components/ProtectedRoute";
import {
  DashboardPage,
  LoginPage,
  AuthCallbackPage,
  RepositoriesPage,
  ProfilePage,
} from "@/pages";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected + layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* default route */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/repositories" element={<RepositoriesPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Placeholderlar */}
            <Route
              path="/organizations"
              element={
                <div className="px-6 py-8 text-slate-500">
                  Organizations placeholder
                </div>
              }
            />
            <Route
              path="/settings"
              element={
                <div className="px-6 py-8 text-slate-500">
                  Settings placeholder
                </div>
              }
            />
          </Route>
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center text-slate-500">
              404 – Page not found
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
