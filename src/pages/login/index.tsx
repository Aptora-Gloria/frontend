import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Github } from 'lucide-react';
import { buildGitHubAuthUrl } from '../../features/auth-login/lib/buildGitHubAuthUrl';

export const LoginPage = () => {
  const [dark] = useState(false); // Dark mode state (currently not used but kept for future use)

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [dark]);

  // Başlığa tıklayınca sayfayı yenile
  const refreshPage = () => {
    window.location.reload();
  };

  // Klavye ile erişilebilirlik (Enter/Space)
  const handleTitleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      refreshPage();
    }
  };

  // GitHub OAuth login
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
      {/* Soft cross-fade background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,theme(colors.slate.200),transparent_60%)] dark:bg-[radial-gradient(60%_60%_at_50%_40%,theme(colors.slate.800),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(35%_35%_at_20%_80%,theme(colors.slate.300)/60%,transparent_70%)] dark:bg-[radial-gradient(35%_35%_at_20%_80%,theme(colors.slate.700)/60%,transparent_70%)]" />
      </div>

      {/* Center content */}
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        {/* Logo + Title (title tıklanınca yenile) */}
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

        {/* GitHub button (hover'da havaya kalkar) */}
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

