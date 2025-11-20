import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/shared/contexts/AuthContext';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import { AuthCallbackPage } from '@/pages/auth/callback';
import { LoginPage } from '@/pages/login/LoginPage';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';

const router = createBrowserRouter([
  // 🔒 Korunan dashboard
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },

  // 🔑 Login sayfası
  {
    path: '/login',
    element: <LoginPage />,
  },

  // 🔁 GitHub'dan dönen callback
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
]);

export function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <RouterProvider router={router} />
      </div>
    </AuthProvider>
  );
}

export default App;
