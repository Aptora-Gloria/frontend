import { useEffect, useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Github } from 'lucide-react';
import { buildGitHubAuthUrl } from '../../features/auth-login/lib/buildGitHubAuthUrl';

export const LoginPage = () => {
  const [dark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [dark]);

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
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden selection:bg-slate-900/10 dark:selection:bg-white/10">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(2,6,23,0.65) 0%, rgba(30,41,59,0.45) 40%, rgba(51,65,85,0.25) 65%, transparent 90%)',
        }}
      />

      {/* Center content */}
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 flex items-center gap-3"
        >
          <span className="inline-block h-6 w-6 rounded-full border-4 border-slate-400/70 dark:border-slate-500/70" />
          <motion.h1
            role="button"
            tabIndex={0}
            onClick={refreshPage}
            onKeyDown={handleTitleKey}
            title="Sayfayı yenile"
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer select-none text-3xl font-semibold tracking-tight text-slate-800 outline-none dark:text-slate-100"
          >
            Optimetric
          </motion.h1>
        </motion.div>

        <p className="mb-8 text-slate-500 dark:text-slate-400">
          Sign in to your dashboard
        </p>

        {/* GitHub button */}
        <motion.button
          whileHover={{ y: -10, scale: 1.04 }}
          whileTap={{ scale: 0.98, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          onClick={handleGitHubLogin}
          className="group inline-flex items-center gap-3 rounded-full bg-slate-900 px-7 py-4 text-base font-medium text-white shadow-lg shadow-slate-900/20 transition-[filter,transform] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 active:scale-[0.99] dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:focus-visible:ring-slate-600"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-black/40 group-hover:brightness-110 dark:bg-white/60">
            <Github size={16} className="opacity-90" />
          </span>
          <span>Sign in with Github</span>
        </motion.button>
      </div>
    </div>
  );
};
