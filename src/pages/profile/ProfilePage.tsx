import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    MapPin,
    Link as LinkIcon,
    Twitter,
    Github,
    Mail,
    Calendar,
    Shield,
    LogOut,
    CheckCircle2,
    RefreshCw,
    Edit3,
    Award
} from 'lucide-react';

import { useAuth } from '@/shared/contexts/AuthContext';
import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import type { Repo } from '@/entities/repo';
import { Avatar } from '@/shared/ui';

// --- HELPER COMPONENTS ---

const InfoRow = ({ icon: Icon, text, href }: { icon: any, text?: string | null, href?: string }) => {
    if (!text) return null;
    return (
        <div className="flex items-center gap-3 text-sm text-slate-600">
            <Icon className="h-4 w-4 text-slate-400 shrink-0" />
            {href ? (
                <a href={href} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline transition-colors truncate">
                    {text}
                </a>
            ) : (
                <span className="truncate">{text}</span>
            )}
        </div>
    );
};

const StatBox = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
    </div>
);

function TopRepoList({ repos }: { repos: Repo[] }) {
    return (
        <div className="flex flex-col gap-2">
            {repos.map((repo, i) => (
                <div key={repo.id} className="flex items-center justify-between group p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-sm font-bold w-4 text-center ${i < 3 ? 'text-blue-600' : 'text-slate-400'}`}>#{i + 1}</span>
                        <a
                            href={repo.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-slate-700 truncate hover:text-blue-600 transition-colors"
                        >
                            {repo.name}
                        </a>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-sm">
                        <Award size={14} className="text-amber-500" />
                        <span className="text-xs font-bold">{repo.stargazers || 0}</span>
                    </div>
                </div>
            ))}
            {repos.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No repositories found.</div>
            )}
        </div>
    );
}

// --- TYPE DEFINITIONS FOR GITHUB PROFILE ---
interface GithubProfile {
    bio?: string;
    location?: string;
    email?: string;
    blog?: string;
    twitter_username?: string;
    created_at?: string;
    followers?: number;
    following?: number;
    public_repos?: number;
    company?: string;
}

// --- MAIN PAGE ---

export default function ProfilePage() {
    const { user, logout } = useAuth();

    const [githubProfile, setGithubProfile] = useState<GithubProfile | null>(null);
    const [topRepos, setTopRepos] = useState<Repo[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(true);

    // 1. GitHub Detaylarını Çek
    useEffect(() => {
        if (!user || !(user as any).accessToken) return;

        const fetchGithubDetails = async () => {
            try {
                const token = (user as any).accessToken;
                const response = await fetch('https://api.github.com/user', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setGithubProfile(data);
                }
            } catch (error) {
                console.error("Failed to fetch extra github details", error);
            }
        };

        fetchGithubDetails();
    }, [user]);

    // 2. Repoları Çek
    useEffect(() => {
        const fetchRepos = async () => {
            if (!user) return;
            try {
                let data = await getUserRepos();
                if (!data.length) {
                    await initUserRepos();
                    data = await getUserRepos();
                }
                const sorted = [...data]
                    .sort((a, b) => (b.stargazers ?? 0) - (a.stargazers ?? 0))
                    .slice(0, 5);

                setTopRepos(sorted);
            } catch (error) {
                console.error("Failed to load repos for profile", error);
            } finally {
                setLoadingRepos(false);
            }
        };
        fetchRepos();
    }, [user]);

    if (!user) return null;

    // VERİLERİ BİRLEŞTİRME
    const displayUser = {
        name: githubProfile?.company || user.name || user.login,
        displayName: user.name || user.login,
        login: user.login,
        avatarUrl: user.avatar_url,
        bio: githubProfile?.bio || null,
        location: githubProfile?.location || null,
        // DÜZELTME: (user as any).email diyerek hatayı susturuyoruz
        email: githubProfile?.email || (user as any).email || null,
        website: githubProfile?.blog || null,
        twitter: githubProfile?.twitter_username || null,
        joinedAt: githubProfile?.created_at
            ? new Date(githubProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : null,
        htmlUrl: (user as any).htmlUrl || `https://github.com/${user.login}`
    };

    const websiteDisplay = displayUser.website?.replace(/^https?:\/\//, '');
    const websiteUrl = displayUser.website?.startsWith('http') ? displayUser.website : `https://${displayUser.website}`;

    const stats = {
        repos: githubProfile?.public_repos ?? topRepos.length,
        followers: githubProfile?.followers ?? 0,
        following: githubProfile?.following ?? 0
    };

    return (
        <div className="min-h-screen bg-[#FAFBFC] pb-20">
            {/* Header Banner */}
            <div className="h-48 w-full bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute bottom-4 right-6 flex gap-3">
                </div>
            </div>

            <main className="mx-auto max-w-5xl px-6 -mt-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* SOL KOLON */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 relative overflow-hidden">
                            <div className="relative mb-6">
                                <div className="h-28 w-28 rounded-2xl p-1 bg-white shadow-sm inline-block">
                                    {displayUser.avatarUrl ? (
                                        <img src={displayUser.avatarUrl} alt={displayUser.login} className="h-full w-full rounded-xl object-cover" />
                                    ) : (
                                        <Avatar name={displayUser.login} className="h-full w-full rounded-xl text-4xl" />
                                    )}
                                </div>
                                <div className="absolute bottom-1 left-24">
                                    <div className="h-6 w-6 rounded-full bg-green-500 border-4 border-white flex items-center justify-center">
                                        <CheckCircle2 size={12} className="text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-slate-900">{displayUser.displayName}</h1>
                                <p className="text-slate-500 font-medium">@{displayUser.login}</p>
                            </div>

                            {displayUser.bio && (
                                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                    {displayUser.bio}
                                </p>
                            )}

                            <div className="space-y-3 mb-8">
                                <InfoRow icon={Shield} text="Pro Plan" />
                                <InfoRow icon={MapPin} text={displayUser.location} />
                                <InfoRow icon={Mail} text={displayUser.email} />
                                <InfoRow icon={LinkIcon} text={websiteDisplay} href={websiteUrl} />
                                <InfoRow icon={Calendar} text={displayUser.joinedAt ? `Joined ${displayUser.joinedAt}` : null} />

                                <div className="flex gap-4 pt-2 border-t border-slate-50 mt-4">
                                    {displayUser.twitter && (
                                        <a href={`https://twitter.com/${displayUser.twitter}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors">
                                            <Twitter size={18} />
                                        </a>
                                    )}
                                    <a href={displayUser.htmlUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
                                        <Github size={18} />
                                    </a>
                                </div>
                            </div>

                            <button className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                Edit Profile
                            </button>

                            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                                <RefreshCw size={10} />
                                Last synced: {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </motion.div>

                    {/* SAĞ KOLON */}
                    <div className="lg:col-span-2 space-y-6 pt-16 lg:pt-0">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
                            <StatBox label="Repositories" value={stats.repos} />
                            <StatBox label="Followers" value={stats.followers} />
                            <StatBox label="Following" value={stats.following} />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Award size={20} /></div>
                                <h3 className="text-lg font-bold text-slate-900">Top Repositories</h3>
                            </div>

                            {loadingRepos ? (
                                <div className="space-y-3">
                                    <div className="h-12 w-full bg-slate-50 rounded-xl animate-pulse"></div>
                                    <div className="h-12 w-full bg-slate-50 rounded-xl animate-pulse"></div>
                                </div>
                            ) : (
                                <TopRepoList repos={topRepos} />
                            )}
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-red-50/50 rounded-3xl border border-red-100 p-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-red-900">Sign Out</h3>
                                    <p className="text-xs text-red-700/70 mt-1">End your current session securely.</p>
                                </div>
                                <button onClick={logout} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors shadow-sm">
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
}