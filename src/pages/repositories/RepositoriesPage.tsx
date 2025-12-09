// src/pages/repositories/RepositoriesPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import {
    Building2,
    CalendarDays,
    Brain,
    FolderGit2,
    ArrowUpDown,
    RotateCcw,
    ChevronRight,
} from 'lucide-react';

import { useAuth } from '@/shared/contexts/AuthContext';
import type { Repo } from '@/entities/repo';
import { Dropdown } from '@/shared/ui';
import { SearchInput } from '@/shared/ui';

/* ---------- Types ---------- */

type LangColorMap = Record<string, string>;

type OrgFilter = 'all' | string;
type RangeFilter = 'all' | '30d' | '90d';
type StatusFilter = 'all' | 'active' | 'stale';
type SortBy = 'activity' | 'name';

/* ---------- Color map ---------- */

const LANG_COLOR: LangColorMap = {
    JavaScript: '#FCD34D',
    TypeScript: '#60A5FA',
    Python: '#34D399',
    'C++': '#A78BFA',
    Java: '#F97316',
    Markdown: '#94A3B8',
    Default: '#CBD5E1',
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
    const d = new Date(ts);
    return d.toLocaleDateString();
}

/* ---------- Page ---------- */

const RepositoriesPage: React.FC = () => {
    const { user } = useAuth();

    const [repos, setRepos] = useState<Repo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            } catch (e) {
                console.error('❌ Failed to load repos:', e);
                setError('Repositories could not be loaded.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRepos();
    }, [user]);

    const orgOptions = useMemo(
        () => Array.from(new Set(repos.map((r) => getOrgFromRepo(r)))).sort(),
        [repos],
    );

    const langOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    repos
                        .map((r) => r.language)
                        .filter((x): x is string => Boolean(x)),
                ),
            ).sort(),
        [repos],
    );

    const filteredRepos = useMemo(() => {
        let result = [...repos];

        const now = Date.now();
        const cutoff = (days: number) => now - days * 86400000;

        const q = search.trim().toLowerCase();
        if (q) {
            result = result.filter((r) => {
                const name = r.fullName || r.name || '';
                const desc = r.description || '';
                return (
                    name.toLowerCase().includes(q) ||
                    desc.toLowerCase().includes(q)
                );
            });
        }

        if (orgFilter !== 'all') {
            result = result.filter((r) => getOrgFromRepo(r) === orgFilter);
        }

        if (langFilter !== 'all') {
            result = result.filter(
                (r) =>
                    (r.language || '').toLowerCase() === langFilter.toLowerCase(),
            );
        }

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
                const na = (a.fullName || a.name || '').toLowerCase();
                const nb = (b.fullName || b.name || '').toLowerCase();
                return na.localeCompare(nb);
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
        <>
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/70 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                    <div className="text-sm font-medium text-slate-700">
                        Repositories
                    </div>
                    <div className="text-xs text-slate-500">
                        {isLoading ? 'Loading…' : `${filteredRepos.length} repos`}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                        <Dropdown
                            label="Org"
                            icon={<Building2 className="h-4 w-4" />}
                            items={[
                                { label: "All organizations", value: "all" },
                                ...orgOptions.map((o) => ({ label: o, value: o })),
                            ]}
                            value={orgFilter}
                            onChange={(v) => setOrgFilter(v as OrgFilter)}
                            widthClass="w-48"
                        />

                        <Dropdown
                            label="Range"
                            icon={<CalendarDays className="h-4 w-4" />}
                            items={[
                                { label: "Any time", value: "all" },
                                { label: "Last 30 days", value: "30d" },
                                { label: "Last 90 days", value: "90d" },
                            ]}
                            value={rangeFilter}
                            onChange={(v) => setRangeFilter(v as RangeFilter)}
                            widthClass="w-44"
                        />

                        <Dropdown
                            label="Lang"
                            icon={<Brain className="h-4 w-4" />}
                            items={[
                                { label: "All languages", value: "all" },
                                ...langOptions.map((l) => ({ label: l, value: l })),
                            ]}
                            value={langFilter}
                            onChange={setLangFilter}
                            widthClass="w-44"
                        />

                        <Dropdown
                            label="Status"
                            icon={<FolderGit2 className="h-4 w-4" />}
                            items={[
                                { label: "All", value: "all" },
                                { label: "Active (≤ 14d)", value: "active" },
                                { label: "Stale (older than 90d)", value: "stale" },
                            ]}
                            value={statusFilter}
                            onChange={(v) => setStatusFilter(v as StatusFilter)}
                            widthClass="w-52"
                        />

                        <SearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Search…"
                        />

                        <Dropdown
                            label="Sort by"
                            icon={<ArrowUpDown className="h-4 w-4" />}
                            items={[
                                { label: "Activity (recent first)", value: "activity" },
                                { label: "Name (A–Z)", value: "name" },
                            ]}
                            value={sortBy}
                            onChange={(v) => setSortBy(v as SortBy)}
                            widthClass="w-48"
                        />

                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={resetFilters}
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset
                        </button>
                    </div>
                </div>

                {error && (
                    <p className="mt-4 text-sm text-red-500">{error}</p>
                )}

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRepos.map((r) => {
                        const lang = r.language || 'Unknown';
                        const color = LANG_COLOR[lang] ?? LANG_COLOR.Default;
                        const stars = r.stargazers ?? 0;
                        const issues = r.openIssues ?? 0;
                        const watchers = r.watchers ?? 0;
                        const forks = r.forks ?? 0;
                        const updatedLabel = formatUpdatedLabel(r);

                        return (
                            <Link
                                key={r.id}
                                to={`/repositories/${encodeURIComponent(String(r.id))}`}
                                state={{ repo: r }}
                                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <h3 className="mr-3 line-clamp-1 text-sm font-semibold text-slate-800">
                                        {r.fullName || r.name}
                                    </h3>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                                </div>

                                {r.description && (
                                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                        {r.description}
                                    </p>
                                )}

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                                    <span className="inline-flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: color }}
                                        />
                                        {lang}
                                    </span>

                                    <span className="inline-flex items-center gap-1">
                                        ⭐ {stars} stars
                                    </span>

                                    <span className="inline-flex items-center gap-1">
                                        🍴 {forks} forks
                                    </span>

                                    <span className="inline-flex items-center gap-1">
                                        👁 {watchers} watchers
                                    </span>

                                    <span className="inline-flex items-center gap-1">
                                        ⚠ {issues} open issues
                                    </span>

                                    <span className="ml-auto text-slate-500">
                                        Updated {updatedLabel}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}

                    {!isLoading && !error && filteredRepos.length === 0 && (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                            No repositories match current filters.
                        </div>
                    )}
                </div>
            </main>

            <footer className="mt-10 border-t border-slate-200 bg-white/70 py-3 text-center text-xs text-slate-500 backdrop-blur">
                footer placeholder
            </footer>
        </>
    );
};

export default RepositoriesPage;

// legacy helpers removed after shared Dropdown adoption
