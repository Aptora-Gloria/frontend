import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useToast } from '@/shared/contexts/ToastContext';
import { ErrorState } from '@/shared/ui/error-state';
import type { AppError } from '@/shared/errors';
import {
    Building2,
    CalendarDays,
    Brain,
    FolderGit2,
    ArrowUpDown,
    RotateCcw,
    Star,
    GitFork,
    BookOpen,
    Lock,
    Zap,
    ChevronDown,
    Check,
    Database,       // Yeni: Boyut için
    AlertCircle,    // Yeni: Issue için
    Scale           // Yeni: Lisans için
} from 'lucide-react';

import { useAuth } from '@/shared/contexts/AuthContext';
import type { Repo } from '@/entities/repo';
import { SearchInput } from '@/shared/ui';

/* ---------- Types & Constants ---------- */

type LangColorMap = Record<string, string>;
type OrgFilter = 'all' | string;
type RangeFilter = 'all' | '30d' | '90d';
type StatusFilter = 'all' | 'active' | 'stale';
type SortBy = 'activity' | 'name';

const LANG_COLOR: LangColorMap = {
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
    Default: '#94A3B8',
};

/* ---------- Helpers ---------- */

function getOrgFromRepo(repo: Repo): string {
    if (repo.ownerLogin) return repo.ownerLogin;
    if (repo.fullName?.includes('/')) return repo.fullName.split('/')[0];
    return 'unknown';
}

function getUpdatedTime(repo: Repo): number {
    const src = repo.pushedAt || repo.updatedAt || repo.createdAt;
    if (!src) return 0;
    const t = new Date(src).getTime();
    return Number.isNaN(t) ? 0 : t;
}

function formatUpdatedLabel(repo: Repo): string {
    const ts = getUpdatedTime(repo);
    if (!ts) return '—';
    const date = new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(num: number): string {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

// KB cinsinden gelen size'ı MB veya KB olarak formatlar
function formatSize(kb: number): string {
    if (!kb) return '0 KB';
    if (kb >= 1024) {
        return (kb / 1024).toFixed(1) + ' MB';
    }
    return kb + ' KB';
}

/* ---------- Components ---------- */

const FilterDropdown = ({
    label,
    value,
    items,
    onChange,
    icon: Icon
}: {
    label: string,
    value: string,
    items: { label: string, value: string }[],
    onChange: (val: string) => void,
    icon: any
}) => {
    const selectedLabel = items.find(i => i.value === value)?.label || label;

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className="flex h-9 min-w-[130px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 data-[state=open]:border-blue-500 data-[state=open]:ring-2 data-[state=open]:ring-blue-500/20">
                    <div className="flex items-center gap-2">
                        {Icon}
                        <span className="truncate max-w-[90px]">{selectedLabel}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="start"
                    sideOffset={5}
                    className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-xl shadow-slate-200/50 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                >
                    <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                    </DropdownMenu.Label>

                    {items.map((item) => (
                        <DropdownMenu.Item
                            key={item.value}
                            onClick={() => onChange(item.value)}
                            className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition-colors focus:bg-slate-50 focus:text-blue-600 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-700"
                        >
                            {value === item.value && (
                                <span className="absolute right-2 flex h-3 w-3 items-center justify-center">
                                    <Check className="h-2.5 w-2.5 text-blue-600" />
                                </span>
                            )}
                            <span>{item.label}</span>
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
};

const StatCard = ({ label, value, icon: Icon, colorClass, bgClass }: { label: string, value: string | number, icon: any, colorClass: string, bgClass: string }) => (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-transform hover:-translate-y-0.5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
            <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
        </div>
    </div>
);

const RepoCardSkeleton = () => (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
            </div>
        </div>
        <div className="mb-6 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-50" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-50" />
        </div>
        <div className="mt-auto flex gap-4">
            <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
        </div>
    </div>
);

/* ---------- Page ---------- */

const RepositoriesPage: React.FC = () => {
    const { user } = useAuth();
    const { showError, showSuccess } = useToast();

    const [repos, setRepos] = useState<Repo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);

    // Filters States
    const [orgFilter, setOrgFilter] = useState<OrgFilter>('all');
    const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');
    const [langFilter, setLangFilter] = useState<'all' | string>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('activity');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchRepos = async () => {
            if (!user) return;
            try {
                setIsLoading(true);
                setError(null);
                let data = await getUserRepos();
                if (!data.length) {
                    await initUserRepos();
                    data = await getUserRepos();
                }
                setRepos(data);
            } catch (err) {
                console.error('Failed to load repositories:', err);
                const appError = err as AppError;
                setError(appError);
                showError('Failed to load repositories. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRepos();
    }, [user, showError]);

    const handleRetry = () => {
        setError(null);
        const fetchRepos = async () => {
            if (!user) return;
            try {
                setIsLoading(true);
                let data = await getUserRepos();
                if (!data.length) {
                    await initUserRepos();
                    data = await getUserRepos();
                }
                setRepos(data);
                showSuccess('Repositories loaded successfully');
            } catch (err) {
                console.error('Failed to load repositories:', err);
                const appError = err as AppError;
                setError(appError);
                showError('Failed to load repositories. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRepos();
    };

    // Derived Data
    const orgOptions = useMemo(() => Array.from(new Set(repos.map((r) => getOrgFromRepo(r)))).sort(), [repos]);
    const langOptions = useMemo(() => Array.from(new Set(repos.map((r) => r.language).filter(Boolean) as string[])).sort(), [repos]);

    const stats = useMemo(() => {
        const totalStars = repos.reduce((acc, r) => acc + (r.stargazers || 0), 0);
        const totalForks = repos.reduce((acc, r) => acc + (r.forks || 0), 0);
        const activeRepos = repos.filter(r => {
            const updated = getUpdatedTime(r);
            const thirtyDaysAgo = Date.now() - (30 * 86400000);
            return updated > thirtyDaysAgo;
        }).length;
        return { totalStars, totalForks, activeRepos };
    }, [repos]);

    const filteredRepos = useMemo(() => {
        let result = [...repos];
        const now = Date.now();
        const cutoff = (days: number) => now - days * 86400000;
        const q = search.trim().toLowerCase();

        if (q) {
            result = result.filter((r) => {
                const name = r.fullName || r.name || '';
                const desc = r.description || '';
                return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
            });
        }

        if (orgFilter !== 'all') result = result.filter((r) => getOrgFromRepo(r) === orgFilter);
        if (langFilter !== 'all') result = result.filter((r) => (r.language || '').toLowerCase() === langFilter.toLowerCase());

        if (rangeFilter !== 'all') {
            const c = rangeFilter === '30d' ? cutoff(30) : cutoff(90);
            result = result.filter((r) => getUpdatedTime(r) >= c);
        }

        if (statusFilter === 'active') {
            const c = cutoff(14);
            result = result.filter((r) => getUpdatedTime(r) >= c);
        } else if (statusFilter === 'stale') {
            const c = cutoff(90);
            result = result.filter((r) => {
                const t = getUpdatedTime(r);
                return t > 0 && t < c;
            });
        }

        result.sort((a, b) => {
            if (sortBy === 'name') {
                return ((a.fullName || a.name || '').toLowerCase()).localeCompare((b.fullName || b.name || '').toLowerCase());
            }
            return getUpdatedTime(b) - getUpdatedTime(a);
        });

        return result;
    }, [repos, search, orgFilter, langFilter, rangeFilter, statusFilter, sortBy]);

    const resetFilters = () => {
        setOrgFilter('all');
        setRangeFilter('all');
        setLangFilter('all');
        setStatusFilter('all');
        setSortBy('activity');
        setSearch('');
    };

    return (
        <div className="min-h-screen bg-[#FAFBFC]">

            {/* Header Area */}
            <div className="bg-white border-b border-slate-100 pt-6 pb-4 px-8 shadow-sm">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">Repositories</h1>
                            <p className="text-sm text-slate-500">Manage, monitor and analyze your codebases.</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95">
                                <Zap className="h-3.5 w-3.5" />
                                Sync Now
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatCard
                            label="Total Repos"
                            value={repos.length}
                            icon={BookOpen}
                            colorClass="text-blue-600"
                            bgClass="bg-blue-50"
                        />
                        <StatCard
                            label="Total Stars"
                            value={formatNumber(stats.totalStars)}
                            icon={Star}
                            colorClass="text-yellow-500"
                            bgClass="bg-yellow-50"
                        />
                        <StatCard
                            label="Active (30d)"
                            value={stats.activeRepos}
                            icon={Zap}
                            colorClass="text-green-500"
                            bgClass="bg-green-50"
                        />
                        <StatCard
                            label="Total Forks"
                            value={formatNumber(stats.totalForks)}
                            icon={GitFork}
                            colorClass="text-purple-500"
                            bgClass="bg-purple-50"
                        />
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-7xl px-6 py-6">

                {/* Filter Bar */}
                <div className="sticky top-4 z-30 mb-6 rounded-xl border border-slate-200/60 bg-white/90 p-3 shadow-xl shadow-slate-200/40 backdrop-blur-md">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="flex-1">
                            <SearchInput
                                value={search}
                                onChange={setSearch}
                                placeholder="Search repositories..."
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                            <div className="hidden h-6 w-px bg-slate-200 lg:block mx-2" />

                            <FilterDropdown
                                label="Org"
                                icon={<Building2 className="h-3.5 w-3.5 opacity-70" />}
                                items={[{ label: "All", value: "all" }, ...orgOptions.map(o => ({ label: o, value: o }))]}
                                value={orgFilter}
                                onChange={v => setOrgFilter(v as OrgFilter)}
                            />

                            <FilterDropdown
                                label="Lang"
                                icon={<Brain className="h-3.5 w-3.5 opacity-70" />}
                                items={[{ label: "All", value: "all" }, ...langOptions.map(l => ({ label: l, value: l }))]}
                                value={langFilter}
                                onChange={setLangFilter}
                            />

                            <FilterDropdown
                                label="Status"
                                icon={<FolderGit2 className="h-3.5 w-3.5 opacity-70" />}
                                items={[
                                    { label: "All", value: "all" },
                                    { label: "Active", value: "active" },
                                    { label: "Stale", value: "stale" },
                                ]}
                                value={statusFilter}
                                onChange={v => setStatusFilter(v as StatusFilter)}
                            />

                            <FilterDropdown
                                label="Sort"
                                icon={<ArrowUpDown className="h-3.5 w-3.5 opacity-70" />}
                                items={[
                                    { label: "Activity", value: "activity" },
                                    { label: "Name", value: "name" },
                                ]}
                                value={sortBy}
                                onChange={v => setSortBy(v as SortBy)}
                            />

                            {(orgFilter !== 'all' || langFilter !== 'all' || search !== '' || statusFilter !== 'all') && (
                                <button
                                    onClick={resetFilters}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                    title="Reset All Filters"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-8">
                        <ErrorState 
                            error={error} 
                            onRetry={handleRetry}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm"
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => <RepoCardSkeleton key={i} />)
                    ) : (
                        filteredRepos.map((r, index) => {
                            const lang = r.language || 'Unknown';
                            const color = LANG_COLOR[lang] ?? LANG_COLOR.Default;
                            const isPrivate = (r as any).visibility === 'private' || (r as any).private || false;

                            // GERÇEK VERİLER: Size, Open Issues, License
                            const sizeKB = (r as any).size || 0;
                            const issueCount = (r as any).open_issues || (r as any).open_issues_count || 0;
                            const licenseName = (r as any).license?.spdx_id || (r as any).license?.name || "No License";

                            // Size Bar hesaplaması (10MB'ı full kabul ediyoruz, görsel doluluk için)
                            const sizePercentage = Math.min((sizeKB / 10000) * 100, 100);

                            return (
                                <motion.div
                                    key={r.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <Link
                                        to={`/repositories/${encodeURIComponent(String(r.id))}`}
                                        state={{ repo: r }}
                                        className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/50 hover:shadow-xl hover:shadow-blue-500/5"
                                    >
                                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />

                                        <div className="mb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-100 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:ring-blue-100">
                                                        {isPrivate ? <Lock className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <h3 className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-blue-600">
                                                            {r.name}
                                                        </h3>
                                                        {r.ownerLogin && (
                                                            <span className="text-[10px] font-medium text-slate-400">
                                                                {r.ownerLogin}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                                    <CalendarDays className="h-3 w-3" />
                                                    {formatUpdatedLabel(r)}
                                                </span>
                                            </div>

                                            {/* --- İÇERİK ALANI: Açıklama varsa göster, yoksa TEKNİK ÖZET --- */}
                                            {r.description ? (
                                                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                                    {r.description}
                                                </p>
                                            ) : (
                                                // YENİ TASARIM: System Stats Card (Gerçek Veri İçerir)
                                                <div className="mt-4 rounded-lg bg-slate-50 p-2.5 border border-slate-100">

                                                    {/* Üst Satır: Boyut Barı */}
                                                    <div className="mb-2 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                                        <span className="flex items-center gap-1.5">
                                                            <Database className="h-3 w-3 text-slate-400" />
                                                            Codebase Size
                                                        </span>
                                                        <span className="text-slate-700 font-bold">{formatSize(sizeKB)}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-blue-500/60"
                                                            style={{ width: `${Math.max(sizePercentage, 5)}%` }} // En az %5 görünsün
                                                        />
                                                    </div>

                                                    {/* Alt Satır: Grid Info */}
                                                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2">
                                                        <div className="flex items-center gap-1.5" title="License">
                                                            <Scale className="h-3 w-3 text-slate-400" />
                                                            <span className="text-[10px] font-medium text-slate-600 truncate max-w-[80px]">
                                                                {licenseName}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5" title="Open Issues">
                                                            <AlertCircle className="h-3 w-3 text-slate-400" />
                                                            <span className="text-[10px] font-medium text-slate-600">
                                                                {issueCount} Issues
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto border-t border-slate-50 pt-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {r.language && (
                                                        <>
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: color }}></span>
                                                                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }}></span>
                                                            </span>
                                                            <span className="text-[11px] font-medium text-slate-600">{lang}</span>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                                    <div className="flex items-center gap-1 transition-colors hover:text-yellow-600" title="Stars">
                                                        <Star className="h-3 w-3 fill-current text-slate-300 group-hover:text-yellow-400" />
                                                        {formatNumber(r.stargazers ?? 0)}
                                                    </div>
                                                    <div className="flex items-center gap-1 transition-colors hover:text-purple-600" title="Forks">
                                                        <GitFork className="h-3 w-3" />
                                                        {formatNumber(r.forks ?? 0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {!isLoading && !error && filteredRepos.length === 0 && (
                    <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 py-20 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white">
                            <FolderGit2 className="h-7 w-7 text-slate-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">No repositories found</h3>
                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                            We couldn't find any repositories matching your filters.
                        </p>
                        <button
                            onClick={resetFilters}
                            className="mt-4 rounded-lg bg-white px-4 py-1.5 text-xs font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default RepositoriesPage;