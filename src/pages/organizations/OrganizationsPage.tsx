// src/pages/organizations/OrganizationsPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Users,
    ShieldCheck,
    Globe,
    MapPin,
    Search,
    CreditCard,
    LayoutGrid,
    ExternalLink,
    Crown,
    Plus,
    TrendingUp,
    MoreHorizontal
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip
} from 'recharts';

import { Avatar } from '@/shared/ui';

/* ---------- MOCK DATA (Zenginleştirilmiş) ---------- */
// Her organizasyon için sahte aktivite verisi üretiyoruz
const generateSparklineData = () => Array.from({ length: 15 }).map((_, i) => ({
    day: i,
    value: Math.floor(Math.random() * 50) + 10
}));

const MOCK_ORGS = [
    {
        id: '1',
        name: 'Aptora',
        login: 'aptora',
        description: 'Building the next generation of SaaS tools for developers.',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
        isVerified: true,
        plan: 'Enterprise',
        role: 'Owner',
        location: 'San Francisco, CA',
        website: 'https://aptora.com',
        stats: { repos: 14, members: 8, teams: 4 },
        activity: generateSparklineData(),
        membersPreview: ['tahirburak2', 'arifferarslan', 'jane', 'doe'] // Avatar için
    },
    {
        id: '2',
        name: 'Open Source Collective',
        login: 'osc',
        description: 'Supporting open source projects worldwide.',
        avatarUrl: '',
        isVerified: true,
        plan: 'Pro',
        role: 'Maintainer',
        location: 'Remote',
        website: 'https://opencollective.com',
        stats: { repos: 142, members: 2560, teams: 12 },
        activity: generateSparklineData(),
        membersPreview: ['alex', 'sarah', 'mike', 'john', 'emily']
    },
    {
        id: '3',
        name: 'Personal Labs',
        login: 'tahir-labs',
        description: 'My personal playground for experimental projects.',
        avatarUrl: '',
        isVerified: false,
        plan: 'Free',
        role: 'Admin',
        location: 'Istanbul, TR',
        website: '',
        stats: { repos: 5, members: 1, teams: 0 },
        activity: generateSparklineData(),
        membersPreview: ['tahirburak2']
    }
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

/* ---------- UI COMPONENTS ---------- */

// 1. MINI SPARKLINE CHART (Kartların içi için)
const OrgActivitySparkline = ({ data, color }: { data: any[], color: string }) => (
    <div className="h-16 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradient-${color})`}
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

// 2. DISTRIBUTION CHART (Sayfa başı istatistiği)
const RepoDistributionChart = ({ data }: { data: any[] }) => {
    return (
        <div className="h-32 w-32 relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {/* Ortadaki Toplam Sayı */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-400">Total</span>
            </div>
        </div>
    );
};

// 3. ORGANIZATION CARD (Yenilenmiş)
const OrgCard = ({ org, index }: { org: typeof MOCK_ORGS[0], index: number }) => {
    const navigate = useNavigate();

    // Rengi plana göre belirle
    const themeColor = org.plan === 'Enterprise' ? '#4f46e5' : org.plan === 'Pro' ? '#10b981' : '#94a3b8';
    const themeClass = org.plan === 'Enterprise' ? 'text-indigo-600' : org.plan === 'Pro' ? 'text-emerald-600' : 'text-slate-500';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
        >
            <div className="p-6 pb-0">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {org.avatarUrl ? (
                            <img src={org.avatarUrl} alt={org.login} className="h-12 w-12 rounded-xl object-cover bg-slate-50 ring-1 ring-slate-100" />
                        ) : (
                            <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-bold text-lg">
                                {org.login.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-base font-bold text-slate-900">{org.name}</h3>
                                {org.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-blue-500" fill="currentColor" fillOpacity={0.1} />}
                            </div>
                            <p className="text-xs font-medium text-slate-500">@{org.login}</p>
                        </div>
                    </div>

                    <button className="text-slate-300 hover:text-slate-600">
                        <MoreHorizontal size={18} />
                    </button>
                </div>

                {/* Info & Stats */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">{org.stats.repos}</span>
                        <span className="text-xs font-medium text-slate-500">repos</span>
                    </div>

                    {/* Member Stack (Avatar Yığını) */}
                    <div className="flex -space-x-2">
                        {org.membersPreview.slice(0, 4).map((m, i) => (
                            <div key={m} className="h-7 w-7 rounded-full ring-2 ring-white z-10">
                                <Avatar name={m} className="h-full w-full text-[9px]" />
                            </div>
                        ))}
                        {org.stats.members > 4 && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[9px] font-bold text-slate-500 z-0">
                                +{org.stats.members - 4}
                            </div>
                        )}
                    </div>
                </div>

                {/* Plan Badge & Location */}
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className={`font-semibold ${themeClass}`}>{org.plan} Plan</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {org.location || 'Remote'}
                    </span>
                </div>
            </div>

            {/* CHART SECTION (Görsel Zenginlik) */}
            <div className="mt-2 relative">
                <div className="px-6 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    <span>30-Day Activity</span>
                    <span className="text-emerald-600 flex items-center gap-0.5">
                        <TrendingUp size={10} /> +24%
                    </span>
                </div>
                <OrgActivitySparkline data={org.activity} color={themeColor} />
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex items-center border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                <div className="flex-1 flex gap-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        {org.stats.teams} Teams
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/repositories?org=${org.login}`)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors"
                >
                    Dashboard
                    <ExternalLink size={12} />
                </button>
            </div>
        </motion.div>
    );
};

/* ---------- MAIN PAGE ---------- */

export default function OrganizationsPage() {
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { setTimeout(() => setIsLoading(false), 800); }, []);

    const filteredOrgs = useMemo(() => {
        return MOCK_ORGS.filter(org =>
            org.name.toLowerCase().includes(search.toLowerCase()) ||
            org.login.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    // Chart Data Preparation
    const pieData = MOCK_ORGS.map(org => ({ name: org.name, value: org.stats.repos }));
    const totalRepos = MOCK_ORGS.reduce((acc, curr) => acc + curr.stats.repos, 0);

    return (
        <div className="min-h-screen bg-[#FAFBFC] pb-10">

            {/* HERO HEADER */}
            <div className="bg-white border-b border-slate-200">
                <div className="mx-auto max-w-7xl px-8 py-8">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">

                        {/* Title & Search */}
                        <div className="flex-1 w-full lg:w-auto">
                            <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
                            <p className="mt-1 text-sm text-slate-500 mb-6">Manage your teams, billing and permissions.</p>

                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Find an organization..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Right Side: Visual Stats Summary */}
                        <div className="hidden sm:flex items-center gap-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-4">
                                <RepoDistributionChart data={pieData} />
                                <div className="space-y-1">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Repos</div>
                                    <div className="text-2xl font-bold text-slate-900">{totalRepos}</div>
                                    <div className="text-xs text-emerald-600 font-medium">+12 this month</div>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-slate-200" />
                            <div className="space-y-1 pr-4">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Memberships</div>
                                <div className="text-2xl font-bold text-slate-900">{MOCK_ORGS.length}</div>
                                <div className="text-xs text-slate-500 font-medium">Active Orgs</div>
                            </div>
                        </div>

                        {/* Add Button */}
                        <div className="shrink-0">
                            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all active:scale-95">
                                <Plus size={18} />
                                New Organization
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-7xl px-6 py-10">

                {/* ORGANIZATION GRID */}
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[280px] rounded-2xl bg-white p-6 border border-slate-200 shadow-sm animate-pulse">
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-slate-200" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 w-1/2 rounded bg-slate-200" />
                                        <div className="h-3 w-1/3 rounded bg-slate-200" />
                                    </div>
                                </div>
                                <div className="mt-6 space-y-2">
                                    <div className="h-3 w-full rounded bg-slate-200" />
                                    <div className="h-3 w-2/3 rounded bg-slate-200" />
                                </div>
                                <div className="mt-8 h-20 w-full rounded-lg bg-slate-100" />
                            </div>
                        ))}
                    </div>
                ) : filteredOrgs.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {filteredOrgs.map((org, index) => (
                            <OrgCard key={org.id} org={org} index={index} />
                        ))}

                        {/* "Add New" Placeholder Card (Listeyi teşvik etmek için) */}
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="group flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                                <Plus className="h-8 w-8 text-slate-300 group-hover:text-blue-500" />
                            </div>
                            <span className="mt-4 text-sm font-semibold text-slate-500 group-hover:text-blue-600">Join or Create Organization</span>
                        </motion.button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50"><Building2 className="h-8 w-8 text-slate-300" /></div>
                        <h3 className="text-lg font-semibold text-slate-900">No organizations found</h3>
                    </div>
                )}
            </main>
        </div>
    );
}