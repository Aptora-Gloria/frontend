import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    User,
    MapPin,
    Link as LinkIcon,
    Twitter,
    Github,
    Mail,
    Calendar,
    Shield,
    CreditCard,
    Settings,
    LogOut,
    CheckCircle2,
    RefreshCw,
    Edit3
} from 'lucide-react';

import { useAuth } from '@/shared/contexts/AuthContext';
import { Avatar } from '@/shared/ui';

const InfoRow = ({ icon: Icon, text, href }: { icon: any, text: string, href?: string }) => (
    <div className="flex items-center gap-3 text-sm text-slate-600">
        <Icon className="h-4 w-4 text-slate-400" />
        {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline transition-colors">
                {text}
            </a>
        ) : (
            <span>{text}</span>
        )}
    </div>
);

const SettingToggle = ({ label, description, enabled }: { label: string, description: string, enabled?: boolean }) => {
    const [isOn, setIsOn] = useState(enabled || false);
    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="pr-4">
                <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
            <button
                onClick={() => setIsOn(!isOn)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isOn ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
};

const StatBox = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
    </div>
);

export default function ProfilePage() {
    const { user, logout } = useAuth();

    const extendedUser = {
        ...user,
        bio: "Senior Frontend Developer • Building cool SaaS products • Open Source Enthusiast",
        location: "Istanbul, Turkey",
        email: "burak@optimetric.io",
        website: "https://tahirburak.com",
        twitter: "tahirburak2",
        plan: "Pro Plan",
        joinedAt: "November 2024",
        stats: { repos: 14, followers: 128, following: 42 }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#FAFBFC] pb-20">
            <div className="h-48 w-full bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute bottom-4 right-6 flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md text-white text-xs font-medium hover:bg-white/20 transition-colors border border-white/10">
                        <Edit3 size={14} /> Change Cover
                    </button>
                </div>
            </div>

            <main className="mx-auto max-w-5xl px-6 -mt-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 relative overflow-hidden">
                            <div className="relative mb-6">
                                <div className="h-28 w-28 rounded-2xl p-1 bg-white shadow-sm inline-block">
                                    {/* HATA ÇÖZÜMÜ: Img tag kullanımı */}
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.login} className="h-full w-full rounded-xl object-cover" />
                                    ) : (
                                        <Avatar name={user.login} className="h-full w-full rounded-xl text-4xl" />
                                    )}
                                </div>
                                <div className="absolute bottom-1 left-24">
                                    <div className="h-6 w-6 rounded-full bg-green-500 border-4 border-white flex items-center justify-center">
                                        <CheckCircle2 size={12} className="text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-slate-900">{user.name || user.login}</h1>
                                <p className="text-slate-500 font-medium">@{user.login}</p>
                            </div>

                            <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                {extendedUser.bio}
                            </p>

                            <div className="space-y-3 mb-8">
                                <InfoRow icon={Shield} text={extendedUser.plan} />
                                <InfoRow icon={MapPin} text={extendedUser.location} />
                                <InfoRow icon={Mail} text={extendedUser.email} />
                                <InfoRow icon={LinkIcon} text="tahirburak.com" href={extendedUser.website} />
                                <InfoRow icon={Calendar} text={`Joined ${extendedUser.joinedAt}`} />
                                <div className="flex gap-4 pt-2">
                                    <a href={`https://twitter.com/${extendedUser.twitter}`} className="text-slate-400 hover:text-blue-400 transition-colors"><Twitter size={18} /></a>
                                    {user.htmlUrl && <a href={user.htmlUrl} className="text-slate-400 hover:text-slate-900 transition-colors"><Github size={18} /></a>}
                                </div>
                            </div>

                            <button className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                Edit Profile
                            </button>

                            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                                <RefreshCw size={10} />
                                Last synced: {user.lastSyncedAt ? new Date(user.lastSyncedAt).toLocaleDateString() : 'Never'}
                            </div>
                        </div>
                    </motion.div>

                    <div className="lg:col-span-2 space-y-6 pt-16 lg:pt-0">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
                            <StatBox label="Repositories" value={extendedUser.stats.repos} />
                            <StatBox label="Followers" value={extendedUser.stats.followers} />
                            <StatBox label="Following" value={extendedUser.stats.following} />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Settings size={20} /></div>
                                <h3 className="text-lg font-bold text-slate-900">General Preferences</h3>
                            </div>
                            <div className="space-y-4">
                                <SettingToggle label="Email Notifications" description="Receive daily summaries of your repository activities." enabled={true} />
                                <SettingToggle label="Marketing Emails" description="Receive news about new features and updates." enabled={false} />
                                <SettingToggle label="Public Profile" description="Allow others to see your profile and repositories." enabled={true} />
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><CreditCard size={20} /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Current Plan</h3>
                                        <p className="text-xs text-slate-500">Manage your subscription</p>
                                    </div>
                                </div>
                                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">PRO</span>
                            </div>
                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-2 font-medium">
                                    <span className="text-slate-700">Repository Limit</span>
                                    <span className="text-slate-900">14 / 50</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 w-[28%] rounded-full" />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Cycle renews on Dec 24, 2025</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">Upgrade Plan</button>
                                <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">Billing Details</button>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-red-50/50 rounded-3xl border border-red-100 p-8">
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