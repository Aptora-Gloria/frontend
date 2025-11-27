// src/pages/repositories/RepositoriesPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import {
    Building2,
    CalendarDays,
    Brain,
    FolderGit2,
    Search,
    ArrowUpDown,
    RotateCcw,
    ChevronRight,
} from 'lucide-react';

import { useAuth } from '@/shared/contexts/AuthContext';
import type { Repo } from '@/entities/repo';

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

    // filters
    const [orgFilter, setOrgFilter] = useState<OrgFilter>('all');
    const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all'); // <-- all ile başlasın
    const [langFilter, setLangFilter] = useState<'all' | string>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('activity');
    const [search, setSearch] = useState('');

    // dropdown open/close state
    const [isOrgOpen, setIsOrgOpen] = useState(false);
    const [isRangeOpen, setIsRangeOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    // reposu çek
    useEffect(() => {
        const fetchRepos = async () => {
            if (!user) return;

            try {
                setIsLoading(true);
                setError(null);

                // 1) Önce DB’den oku (user + org hepsi)
                let data = await getUserRepos();

                // 2) Eğer hiç repo yoksa init et, sonra tekrar oku
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

    // org/lang dropdown seçenekleri
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

    // filtre + sort
    const filteredRepos = useMemo(() => {
        let result = [...repos];

        const now = Date.now();
        const cutoff = (days: number) => now - days * 24 * 60 * 60 * 1000;

        // search
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

        // org
        if (orgFilter !== 'all') {
            result = result.filter((r) => getOrgFromRepo(r) === orgFilter);
        }

        // language
        if (langFilter !== 'all') {
            result = result.filter(
                (r) =>
                    (r.language || '').toLowerCase() === langFilter.toLowerCase(),
            );
        }

        // range (updated/pushed)
        if (rangeFilter !== 'all') {
            const c = rangeFilter === '30d' ? cutoff(30) : cutoff(90);
            result = result.filter((r) => getUpdatedTime(r) >= c);
        }

        // status: active => son 14 gün, stale => 90 günden eski
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

        // sort
        result.sort((a, b) => {
            if (sortBy === 'name') {
                const na = (a.fullName || a.name || '').toLowerCase();
                const nb = (b.fullName || b.name || '').toLowerCase();
                return na.localeCompare(nb);
            }
            // activity: updated desc
            return getUpdatedTime(b) - getUpdatedTime(a);
        });

        return result;
    }, [repos, search, orgFilter, langFilter, rangeFilter, statusFilter, sortBy]);

    const closeAllDropdowns = () => {
        setIsOrgOpen(false);
        setIsRangeOpen(false);
        setIsLangOpen(false);
        setIsStatusOpen(false);
        setIsSortOpen(false);
    };

    const resetFilters = () => {
        setOrgFilter('all');
        setRangeFilter('all');
        setLangFilter('all');
        setStatusFilter('all');
        setSortBy('activity');
        setSearch('');
        closeAllDropdowns();
    };

    /* ---------- render ---------- */

    return (
        <>
            {/* Header */}
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
                {/* Filter toolbar */}
                {/* ... filtre toolbar kısmı değişmedi ... */}

                {/* Repo cards grid */}
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRepos.map((r) => {
                        const lang = r.language || 'Unknown';
                        const color = LANG_COLOR[lang] ?? LANG_COLOR.Default;
                        const stars = r.stargazers ?? 0;
                        const issues = r.openIssues ?? 0;
                        const updatedLabel = formatUpdatedLabel(r);

                        return (
                            <Link
                                key={r.id}
                                to={`/repositories/${encodeURIComponent(String(r.id))}`}
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
                                        <svg
                                            className="h-3.5 w-3.5 text-slate-400"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <path d="M12 2l3 7h7l-5.5 4.1L18 21l-6-4-6 4 1.5-7.9L2 9h7z" />
                                        </svg>
                                        {stars} stars
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <svg
                                            className="h-3.5 w-3.5 text-slate-400"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <path d="M3 13h2v-2H3v2zm4 0h14v-2H7v2z" />
                                        </svg>
                                        {issues} open issues
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
