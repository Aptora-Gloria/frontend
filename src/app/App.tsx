import { Routes, Route, Navigate } from 'react-router-dom';

import {
  DashboardPage,
  LoginPage,
  AuthCallbackPage,
  RepositoriesPage,
  RepoDetailPage,
  ProfilePage,
  BranchCommitsPage,
  OrganizationsPage,
} from '@/pages';

import { ProtectedRoute } from '@/shared/components';
import AppLayout from './AppLayout';
import PrDetailPage from '@/pages/pull-request/PrdetailPage';

export default function App() {
  return (
    <Routes>
      {/* --- Public Routes --- */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* --- Protected Routes --- */}

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

      {/* Repositories List */}
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

      {/* Repository Detail */}
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

      {/* Branch Commits (Timeline) */}
      <Route
        path="/repositories/:repoId/branches/:branchName/commits"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BranchCommitsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Organizations */}
      <Route
        path="/organizations"
        element={
          <ProtectedRoute>
            <AppLayout>
              <OrganizationsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/repositories/:repoId/pull-requests/:prNumber"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PrDetailPage />
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

      {/* Fallback: Unknown routes go to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}