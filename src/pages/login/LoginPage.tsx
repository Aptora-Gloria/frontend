import { useEffect, useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Github } from 'lucide-react';
import { buildGitHubAuthUrl } from '../../features/auth-login/lib/buildGitHubAuthUrl';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useToast } from '@/shared/contexts/ToastContext';

export const LoginPage = () => {
  // Artık kesinlikle Light Mode'dayız.
  const [dark] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { showError } = useToast();

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [dark]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const refreshPage = () => {
    window.location.reload();
  };

  const handleTitleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      refreshPage();
    }
  };

  const handleGitHubLogin = () => {
    try {
      const authUrl = buildGitHubAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to build GitHub auth URL:', error);
      showError('Failed to initiate GitHub login. Please check your configuration.');
    }
  };

  return (
    // ZEMİN: Saf Beyaz.
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-white text-slate-900 selection:bg-blue-100">

      {/* --- MAVİ/SİYAH ATMOSFER (TAM TERSİ EFEKT) --- */}
      {/* Karanlıkta ışık yakmak yerine, beyaz zemine renkli bir 'hale' ekliyoruz. */}

      {/* 1. Katman: Çok geniş, silik bir Mavi/Gri gradyan. Sayfanın altına derinlik katar. */}
      <div
        className="absolute -top-[30%] left-1/2 h-[100vh] w-[150vw] -translate-x-1/2 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(255, 255, 255, 0) 70%)' // Hafif Mavi Hale
        }}
      />

      {/* 2. Katman: Tam arkada daha yoğun ama küçük bir Lacivert/Siyah odak noktası */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-blue-100/30 blur-[100px] mix-blend-multiply pointer-events-none" />


      {/* --- İÇERİK --- */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex w-full max-w-[380px] flex-col items-center gap-8 px-6 text-center"
      >

        {/* LOGO ALANI */}
        <div className="flex flex-col items-center gap-5">
          {/* Logo Kutusu: Beyazın üstünde net durması için hafif bir gölge ve border */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] ring-1 ring-slate-900/5">
            {/* İkon: Mavi veya Siyah tonlarında */}
            <div className="h-6 w-6 rounded-full border-[3.5px] border-slate-900" />
          </div>

          <div className="space-y-2">
            <h1
              role="button"
              tabIndex={0}
              onClick={refreshPage}
              onKeyDown={handleTitleKey}
              className="cursor-pointer select-none text-3xl font-bold tracking-tight text-slate-900"
            >
              Optimetric
            </h1>
            <p className="text-[15px] font-medium text-slate-500">
              Sign in to your dashboard
            </p>
          </div>
        </div>

        {/* BUTON: SİYAH (Mavi Vurgulu) */}
        {/* "Mavi ya da Siyah olsun" dediğin için butonu SİYAH yapıp, hover'da hafif laciverte çalan bir ton verdim. */}
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGitHubLogin}
          className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-[#0f172a] py-4 px-6 text-[15px] font-semibold text-white shadow-xl shadow-slate-900/10 transition-all hover:bg-[#1e293b] hover:shadow-2xl hover:shadow-slate-900/20 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          <Github className="h-5 w-5 text-white transition-opacity group-hover:opacity-90" />
          <span>Sign in with GitHub</span>
        </motion.button>

        {/* Alt bilgi: Silik yazı */}
        <p className="mt-4 text-xs text-slate-400">
          Secure access via GitHub Authentication
        </p>

      </motion.div>
    </div>
  );
};