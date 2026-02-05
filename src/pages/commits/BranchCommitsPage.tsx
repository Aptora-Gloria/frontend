// src/pages/commits/BranchCommitsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    ArrowLeft,
    GitBranch,
    Search,
    ExternalLink,
    GitCommitHorizontal,
    Copy,
    Check,
    Calendar,
    Hash,
    BarChart3,
    History,
    Zap,
    Users,
    Filter
} from "lucide-react";

import type { Repo } from "@/entities/repo";
import { getUserRepos } from "@/shared/lib/repo-api";
import { queryCommits, initCommits } from "@/shared/lib/commit-api";
import { Avatar } from "@/shared/ui";
import { useToast } from '@/shared/contexts/ToastContext';
import { ErrorState } from '@/shared/ui/error-state';
import type { AppError } from '@/shared/errors';

/* ---------- Types & Mapper ---------- */

function mapCommitToItem(c: any) {
    const message = c.message || c.commit?.message || 'No commit message';
    const authorName = c.authorName || c.commit?.author?.name || c.author?.login || 'Unknown';
    const authorLogin = c.authorLogin || c.author?.login || c.commit?.author?.name || 'unknown';
    const dateStr = c.committedAt || c.date || c.commit?.author?.date || c.commit?.committer?.date;
    const dateObj = dateStr ? new Date(dateStr) : new Date();
    const url = c.htmlUrl || c.html_url || c.url || '#';

    return {
        sha: c.sha ?? '',
        message,
        authorName,
        authorLogin,
        // Force English Locale for Grouping Keys
        dateKey: dateObj.toLocaleDateString('en-US'),
        // Display Time (e.g., 2:30 PM)
        time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        // Full Display Date (e.g., November 24, 2025)
        fullDate: dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        rawDate: dateObj,
        url,
    };
}

// "2 days ago" helper
function timeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

/* ---------- UI Components ---------- */

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className="group/copy rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Copy SHA"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 group-hover/copy:scale-110 transition-transform" />}
        </button>
    );
};

// Activity Chart Component
const ActivityChart = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        minTickGap={30}
                    />
                    <YAxis hide />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                        labelStyle={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.75rem' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        name="Commits"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

/* ---------- Page Component ---------- */

export default function BranchCommitsPage() {
    const { repoId, branchName } = useParams<{ repoId: string; branchName: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const stateRepo = location.state?.repo as Repo | undefined;

    const { showError, showSuccess } = useToast();

    const [repo, setRepo] = useState<Repo | null>(stateRepo ?? null);
    const [commits, setCommits] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [authorFilter, setAuthorFilter] = useState("all");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);
    const [repoError, setRepoError] = useState<AppError | null>(null);

    /* ---------- Load Data ---------- */
    useEffect(() => {
        if (repo) return;
        const loadRepo = async () => {
            try {
                const data = await getUserRepos();
                const found = data.find((r) => String(r.id) === String(repoId)) ?? null;
                setRepo(found);
            } catch (error) {
                console.error('Failed to load repository:', error);
                const appError = error as AppError;
                setRepoError(appError);
                showError('Failed to load repository information.');
            }
        };
        loadRepo();
    }, [repoId, repo]);

    useEffect(() => {
        if (!repo?.fullName || !branchName) return;
        const loadCommits = async () => {
            try {
                setIsLoading(true);
                setError(null);
                await initCommits(repo.fullName, branchName);
                const data = await queryCommits(repo.fullName, branchName);
                const mappedData = data.map(mapCommitToItem);
                mappedData.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
                setCommits(mappedData);
            } catch (err) {
                console.error('Failed to load commits:', err);
                const appError = err as AppError;
                setError(appError);
                setCommits([]);
                showError('Failed to load commits. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        loadCommits();
    }, [repo, branchName]);

    /* ---------- Data Processing ---------- */

    // 1. Chart Data (Last 30 days - English Locale)
    const chartData = useMemo(() => {
        // DÜZELTME: 14 yerine 30 yapıldı
        const days = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return {
                iso: d.toISOString().split('T')[0],
                label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
        }).reverse();

        return days.map(day => {
            const count = commits.filter(c =>
                c.rawDate.toISOString().startsWith(day.iso)
            ).length;
            return { date: day.label, count };
        });
    }, [commits]);

    // 2. Authors List
    const authors = useMemo(() => {
        const unique = new Set(commits.map(c => c.authorName));
        return Array.from(unique);
    }, [commits]);

    // 3. Stats
    const stats = useMemo(() => ({
        total: commits.length,
        contributors: authors.length,
        lastActive: commits.length > 0 ? timeAgo(commits[0].rawDate) : 'Never'
    }), [commits, authors]);

    // 4. Grouped Commits by Date
    const groupedCommits = useMemo(() => {
        const q = search.trim().toLowerCase();

        const filtered = commits.filter((c) => {
            const matchesSearch = !q || c.message.toLowerCase().includes(q) || c.authorName.toLowerCase().includes(q) || c.sha.includes(q);
            const matchesAuthor = authorFilter === "all" || c.authorName === authorFilter;
            return matchesSearch && matchesAuthor;
        });

        const groups: Record<string, any[]> = {};
        filtered.forEach(c => {
            if (!groups[c.fullDate]) {
                groups[c.fullDate] = [];
            }
            groups[c.fullDate].push(c);
        });

        return groups;
    }, [commits, search, authorFilter]);

    const groupKeys = Object.keys(groupedCommits);

    // Error State
    if (!repo && !isLoading && error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFBFC] p-4 text-center">
                <div className="rounded-full bg-red-50 p-4 mb-4">
                    <ArrowLeft className="h-6 w-6 text-red-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Repository Not Found</h2>
                <p className="mt-2 text-sm text-slate-500">{error.message}</p>
                <button onClick={() => navigate('/repositories')} className="mt-6 text-sm font-medium text-blue-600 hover:underline">
                    Back to Repositories
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFBFC]">

            {/* HEADER */}
            <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md">
                <div className="mx-auto max-w-5xl">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="group flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 hover:shadow-sm"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                        </button>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span>{repo?.fullName || '...'}</span>
                                <span className="text-slate-300">/</span>
                                <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                                    <GitBranch className="h-3 w-3" />
                                    {branchName}
                                </div>
                            </div>
                            <h1 className="text-lg font-bold text-slate-900">Commit History</h1>
                        </div>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-5xl px-6 py-8">

                {/* --- ANALYTICS DASHBOARD CARD --- */}
                {!isLoading && commits.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3"
                    >
                        {/* Stats Cards */}
                        <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div>
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <History className="h-4 w-4" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Total Commits</span>
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                            </div>
                            <div className="mt-6">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Latest Activity</span>
                                </div>
                                <div className="text-sm font-medium text-slate-700">
                                    {commits[0]?.time} • {timeAgo(commits[0].rawDate)}
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <BarChart3 className="h-4 w-4" />
                                    {/* DÜZELTME: Başlık güncellendi */}
                                    <span className="text-xs font-semibold uppercase tracking-wider">Commit Velocity (30 Days)</span>
                                </div>
                            </div>
                            <div className="flex-1 min-h-[160px]">
                                <ActivityChart data={chartData} />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* FILTERS & SEARCH */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search commits by message, author or SHA..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                    </div>

                    <div className="relative w-full sm:w-56">
                        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select
                            value={authorFilter}
                            onChange={(e) => setAuthorFilter(e.target.value)}
                            className="w-full h-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="all">All Authors</option>
                            {authors.map(author => (
                                <option key={author} value={author}>{author}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                </div>

                {/* --- TIMELINE LIST (GROUPED) --- */}
                <div className="relative pb-10">
                    <div className="absolute left-[27px] top-4 bottom-0 w-px bg-slate-200" />

                    {isLoading ? (
                        <div className="py-20 text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                            <p className="mt-4 text-sm text-slate-500">Loading history...</p>
                        </div>
                    ) : groupKeys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
                            <GitCommitHorizontal className="h-10 w-10 text-slate-300 mb-4" />
                            <h3 className="text-sm font-medium text-slate-900">No commits found</h3>
                            <p className="mt-1 text-xs text-slate-500">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        // DATE GROUPS
                        groupKeys.map((dateLabel, groupIdx) => (
                            <div key={dateLabel} className="mb-8 relative">

                                {/* Date Header */}
                                <div className="sticky top-[80px] z-10 mb-6 flex items-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#FAFBFC] bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div className="ml-4 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                                        Commits on {dateLabel}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-4 pl-[56px]">
                                    {groupedCommits[dateLabel].map((c, idx) => (
                                        <motion.div
                                            key={c.sha}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                                            className="group relative"
                                        >
                                            <div className="absolute -left-[28px] top-1/2 h-px w-5 bg-slate-300 group-hover:bg-blue-400 transition-colors" />
                                            <div className="absolute -left-[31px] top-1/2 -mt-1 h-2 w-2 rounded-full border-2 border-[#FAFBFC] bg-slate-400 group-hover:bg-blue-500 group-hover:scale-125 transition-all" />

                                            {/* Commit Card */}
                                            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">

                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <Avatar name={c.authorLogin} className="h-10 w-10 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 leading-snug truncate pr-2">
                                                            {c.message}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                            <span className="font-medium text-slate-700">{c.authorName}</span>
                                                            <span>•</span>
                                                            <span>{c.time}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-2 pl-14 sm:pl-0">
                                                    <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
                                                        <Hash className="h-3 w-3 text-slate-400" />
                                                        <span className="font-mono text-xs text-slate-600">{c.sha.slice(0, 7)}</span>
                                                        <div className="h-3 w-px bg-slate-200 mx-1" />
                                                        <CopyButton text={c.sha} />
                                                    </div>

                                                    <a
                                                        href={c.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-400 hover:border-blue-200 hover:text-blue-600 hover:shadow-sm transition-all"
                                                        title="View on GitHub"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}