import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/shared/contexts/AuthContext';
import { DashboardPage } from '@/pages/dashboard';
import { AuthCallbackPage } from '@/pages/auth/callback';

const router = createBrowserRouter([
  { path: '/', element: <DashboardPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
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
