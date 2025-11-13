import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { LoginPage } from '@/pages/login';
import { Button } from '@/shared/ui/Button';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // Loading state - authentication kontrolü yapılıyor
  if (isLoading) {
    return (
      <main className="p-6">
        <div className="max-w-md mx-auto mt-20 text-center">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    );
  }

  // Not authenticated - show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated - show dashboard
  return (
    <main className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {user && (
            <p className="mt-2 text-sm text-gray-600">
              Welcome, {user.name || user.login}!
            </p>
          )}
        </div>
        <Button
          onClick={() => {
            logout();
            navigate('/', { replace: true });
          }}
          className="bg-red-600 text-white border-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500"
        >
          Çıkış Yap
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Dashboard content will be here...</p>
      </div>
    </main>
  );
};
