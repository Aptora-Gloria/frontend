import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    GitCommit,
    GitPullRequest,
    TrendingUp,
    Calendar,
    Code2,
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    Clock,
    BarChart3,
    Zap
} from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    BarChart,
    AreaChart,
    Area
} from 'recharts';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/shared/contexts/AuthContext';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';
import { useToast } from '@/shared/contexts/ToastContext';

// API Importları
import type { UserMetricsDto } from '@/shared/lib/dto/user-metrics-dto';
import { fetchUserMetrics } from '@/shared/lib/user-performance-api';
import { getUserRepos } from '@/shared/lib/repo-api';
import { getRepoLanguages, initLanguages } from '@/shared/lib/language-api'; // Init fonksiyonunu da ekledik

// Entity Importu
import type { RepoLanguage } from '@/entities/language';

// --- SABİT RENKLER ---
const LANG_COLOR: Record<string, string> = {
    JavaScript: '#F7DF1E',
    TypeScript: '#3178C6',
    Python: '#3776AB',
    'C++': '#00599C',
    Java: '#007396',
    Markdown: '#000000',
    Vue: '#4FC08D',
    React: '#61DAFB',
    Go: '#00ADD8',
    Rust: '#DEA584',
    HTML: '#E34C26',
    CSS: '#563D7C',
    Shell: '#89e051',
    Default: '#94A3B8',
};

const COLORS = {
    blue: '#3b82f6',
    indigo: '#6366f1',
    emerald: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    slate: '#64748b',
    purple: '#8b5cf6',
    grid: '#f1f5f9',
    textSub: '#94a3b8',
    chartColors: ['#3b82f6', '#6366f1', '#8b5cf6', '#64748b', '#10b981']
};

/* ---------- UI COMPONENTS ---------- */
const StatCard = ({ title, value, icon: Icon, trend, themeColor, suffix, subValue }: any) => {
    const themeMap: any = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', trend: 'text-blue-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', trend: 'text-purple-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', trend: 'text-amber-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', trend: 'text-emerald-600' },
        red: { bg: 'bg-red-50', text: 'text-red-600', trend: 'text-red-600' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', trend: 'text-indigo-600' },
    };
    const t = themeMap[themeColor] || themeMap.blue;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
                    <div className={`p-2.5 rounded-xl ${t.bg} ${t.text}`}>
                        <Icon size={18} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                    {suffix && <span className="text-slate-400 font-medium text-sm">{suffix}</span>}
                </div>
                {subValue && <div className="text-xs text-slate-400 mt-1 font-medium">{subValue}</div>}
            </div>
            {trend !== undefined && trend !== null && (
                <div className={`flex items-center gap-1.5 text-xs font-bold mt-4 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    <TrendingUp size={14} className={trend < 0 ? 'rotate-180' : ''} />
                    <span>{trend > 0 ? '+' : ''}{Math.abs(trend)}% growth</span>
                </div>
            )}
        </motion.div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 backdrop-blur-md text-slate-700 text-xs p-3 rounded-xl shadow-xl ring-1 ring-slate-200 border border-slate-100 z-50">
                <p className="font-bold mb-2 text-slate-900 border-b border-slate-100 pb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 py-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color || entry.stroke }}></div>
                        <span className="font-medium text-slate-600 capitalize">{entry.name}:</span>
                        <span className="font-bold font-mono text-slate-900">{
                            typeof entry.value === 'number'
                                ? (Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(1))
                                : entry.value
                        }</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

/* ---------- MAIN PAGE ---------- */
export default function UserPerformancePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showError } = useToast();

    const [metrics, setMetrics] = useState<UserMetricsDto | null>(null);
    const [aggregatedLanguages, setAggregatedLanguages] = useState<RepoLanguage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.login) return;

        const loadData = async () => {
            try {
                setLoading(true);
                const token = (user as any).accessToken || (user as any).token || localStorage.getItem('token');

                // 1. User Metrics (Genel istatistikler)
                const metricsPromise = fetchUserMetrics(user.login, token);

                // 2. Language Aggregation (Init + Query)
                const languagesPromise = (async () => {
                    const repos = await getUserRepos();

                    if (!repos || repos.length === 0) return [];

                    // Her repo için sırayla Init ve Query yapıyoruz
                    // (Paralel yapmak API'yi yorabilir ama şimdilik hızlı olması için Promise.all kullanıyoruz)
                    const langPromises = repos.map(async (repo) => {
                        try {
                            // ÖNCE INIT (Backend'e hesaplat)
                            await initLanguages(repo.fullName, token);

                            // SONRA QUERY (Hesaplanmış veriyi çek)
                            return await getRepoLanguages(repo.fullName, token);
                        } catch (e) {
                            return null;
                        }
                    });

                    const repoLangs = await Promise.all(langPromises);

                    // Gelen verileri topla (Aggregation)
                    const totalBytesMap: Record<string, number> = {};
                    let grandTotalBytes = 0;

                    repoLangs.forEach(stat => {
                        if (stat && stat.items) {
                            stat.items.forEach(lang => {
                                totalBytesMap[lang.name] = (totalBytesMap[lang.name] || 0) + lang.bytes;
                                grandTotalBytes += lang.bytes;
                            });
                        }
                    });

                    if (grandTotalBytes === 0) return [];

                    // Yüzdeleri hesapla ve sırala
                    return Object.entries(totalBytesMap)
                        .map(([name, bytes]) => ({
                            name,
                            bytes,
                            percentage: (bytes / grandTotalBytes) * 100
                        }))
                        .sort((a, b) => b.bytes - a.bytes)
                        .slice(0, 5); // İlk 5 dil
                })();

                const [metricsData, langsData] = await Promise.all([metricsPromise, languagesPromise]);

                setMetrics(metricsData);
                setAggregatedLanguages(langsData);

            } catch (error: any) {
                console.error("Failed to load data:", error);
                if (error.response?.status === 403) {
                    showError("Yetki hatası: Verileri görüntüleme izniniz yok.");
                } else {
                    showError("Veriler yüklenemedi.");
                }
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user]);

    const chartData = useMemo(() => {
        if (!metrics) return null;

        // 1. Weekly Activity Trend
        const weeklyData = metrics.activityTrend.weeklyTrend.map(w => ({
            name: w.week,
            Commits: w.commits,
            PRs: w.pullRequests,
            Reviews: w.reviews
        }));

        // 2. Risk Distribution (PR Size)
        const riskData = [
            { name: 'Safe (<100)', value: metrics.prSize.smallPrCount, color: COLORS.emerald, percent: metrics.prSize.smallPrPercentage },
            { name: 'Risky (100-500)', value: metrics.prSize.mediumPrCount, color: COLORS.amber, percent: metrics.prSize.mediumPrPercentage },
            { name: 'Critical (>500)', value: metrics.prSize.largePrCount, color: COLORS.red, percent: metrics.prSize.largePrPercentage },
        ].filter(d => d.value > 0);

        // 3. Hourly Activity (Sort keys 0-23)
        const hourlyData = Object.entries(metrics.commitTimeAnalysis.commitsByHour)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([hour, count]) => ({ hour: `${hour}:00`, count }));

        // 4. Daily Rhythm (Sort days correctly)
        const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        const dailyData = dayOrder.map(day => ({
            day: day.substring(0, 3),
            count: metrics.commitTimeAnalysis.commitsByDayOfWeek[day] || 0
        }));

        return { weeklyData, riskData, hourlyData, dailyData };
    }, [metrics]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#FAFBFC]"><LoadingSpinner size="lg" /></div>;
    if (!metrics || !chartData) return <div className="p-8 text-center text-slate-500">No data available. Try syncing your repositories.</div>;

    return (
        <div className="min-h-screen bg-[#FAFBFC] p-6 lg:p-8 font-sans text-slate-900">
            {/* HEADER */}
            <div className="mb-8">
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4">
                    <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Developer Performance</h1>
                        <p className="text-xs font-medium text-slate-500">Analytics for <span className="font-bold text-slate-700">@{user?.login}</span></p>
                    </div>
                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-semibold text-slate-600 flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        Last 30 Days
                    </div>
                </div>
            </div>

            {/* LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto pb-20">

                {/* ROW 1: KPI CARDS */}
                <StatCard
                    title="Total Commits (30d)"
                    value={metrics.commitTimeAnalysis.last30DaysCommits}
                    icon={GitCommit}
                    themeColor="blue"
                    trend={metrics.activityTrend.activityGrowthRate}
                />
                <StatCard
                    title="Total Activity"
                    value={metrics.activityTrend.totalActivityLast30Days}
                    icon={Zap}
                    themeColor="indigo"
                    subValue="Commits + PRs + Reviews"
                />
                <StatCard
                    title="PR Merge Rate"
                    value={metrics.prMergeRate.mergeRate.toFixed(1)}
                    suffix="%"
                    icon={GitPullRequest}
                    themeColor="purple"
                    subValue={`${metrics.prMergeRate.mergedPullRequests} merged / ${metrics.prMergeRate.totalPullRequests} total`}
                />
                <StatCard
                    title="Code Health (Safe PRs)"
                    value={metrics.prSize.smallPrPercentage.toFixed(1)}
                    suffix="%"
                    icon={CheckCircle2}
                    themeColor="emerald"
                    subValue="PRs under 100 lines"
                />

                {/* ROW 2: MAIN CHARTS */}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="md:col-span-2 lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500" /> Activity Trends (12 Weeks)</h3>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData.weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.textSub }} dy={10} minTickGap={30} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.textSub }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="Commits" barSize={12} fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="PRs" stroke={COLORS.indigo} strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="Reviews" stroke={COLORS.purple} strokeWidth={3} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="md:col-span-1 lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <AlertTriangle className="text-amber-500" size={18} />
                        <h3 className="text-base font-bold text-slate-900">PR Risk Analysis</h3>
                    </div>
                    <div className="flex-1 min-h-[200px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData.riskData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {chartData.riskData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-slate-900">{metrics.prMergeRate.totalPullRequests}</span>
                            <span className="text-xs text-slate-400 font-medium uppercase">Total PRs</span>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3">
                        {chartData.riskData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-slate-600 font-medium">{item.name}</span></div>
                                <span className="font-bold text-slate-900">{item.percent.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* ROW 3: DETAILED BREAKDOWNS */}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="md:col-span-1 lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6"><Calendar className="text-slate-400" size={18} /><h3 className="text-base font-bold text-slate-900">Daily Rhythm</h3></div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.textSub }} dy={10} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Commits" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="md:col-span-1 lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6"><Clock className="text-slate-400" size={18} /><h3 className="text-base font-bold text-slate-900">Hourly Focus</h3></div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.hourlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs><linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3} /><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} /></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.textSub }} minTickGap={30} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.textSub }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" name="Commits" stroke={COLORS.blue} fillOpacity={1} fill="url(#colorHour)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Top Languages - AGGREGATED DATA */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="md:col-span-1 lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6"><Code2 className="text-slate-400" size={18} /><h3 className="text-base font-bold text-slate-900">Top Languages</h3></div>
                    <div className="space-y-4">
                        {aggregatedLanguages.length > 0 ? aggregatedLanguages.map((lang, i) => (
                            <div key={lang.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: LANG_COLOR[lang.name] || COLORS.chartColors[i % COLORS.chartColors.length] }}
                                        />
                                        <span className="text-sm font-medium text-slate-700">{lang.name}</span>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-slate-900">{lang.percentage.toFixed(1)}%</span>
                            </div>
                        )) : (
                            <div className="text-center text-xs text-slate-400 py-10 flex flex-col items-center">
                                <Code2 size={24} className="mb-2 opacity-50" />
                                <span>No language data found yet</span>
                            </div>
                        )}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}