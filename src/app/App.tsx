// src/app/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';

import {
  DashboardPage,
  LoginPage,
  AuthCallbackPage,
  RepositoriesPage,
  RepoDetailPage,
  ProfilePage,
} from '@/pages';
import { ProtectedRoute } from '@/shared/components';
import AppLayout from './AppLayout';

export default function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Repositories list */}
      <Route
        path="/repositories"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RepositoriesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Repo detail */}
      <Route
        path="/repositories/:repoId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RepoDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* unknown route -> dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
