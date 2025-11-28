// src/pages/repositories/RepoDetailPage.tsx
import { Link, useLocation, useParams } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ExternalLink,
    RefreshCw,
    GitBranch as GitBranchIcon,
    Star,
    GitFork,
    Eye,
    AlertCircle,
    Info,
    ChevronRight,
    Search,
} from 'lucide-react';

import type { Repo } from '@/entities/repo';
import type { Commit } from '@/entities/commit';
import type { Branch } from '@/entities/branch';

import { getUserRepos } from '@/shared/lib/repo-api';
import { getBranchesByRepo, initBranchesByRepo } from '@/shared/lib/branch-api';
import { initCommits, queryCommits } from '@/shared/lib/commit-api';

/* ---------- UI Types ---------- */
type CommitItem = {
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
    branch?: string;
};

type BranchItem = {
    id: string;
    name: string;
    isDefault?: boolean;
    lastCommitAt?: string;
    // 👇 yeni alan: son commit mesajı
    lastCommitMessage?: string;
};

type LanguageShare = { name: string; percent: number; color: string };

/* ---------- Şimdilik statik language verisi ---------- */
const LANGUAGES: LanguageShare[] = [
    { name: 'Java', percent: 56, color: '#F97316' },
    { name: 'C++', percent: 22, color: '#A78BFA' },
    { name: 'Python', percent: 12, color: '#34D399' },
    { name: 'JavaScript', percent: 7, color: '#FCD34D' },
    { name: 'Other', percent: 3, color: '#CBD5E1' },
];

/* ---------- Helpers ---------- */
function initials(name: string) {
    const parts = name.trim().split(/\s+|_/);
    const first = parts[0]?.[0] ?? '';
    const last = parts[1]?.[0] ?? '';
    return (first + last).toUpperCase() || (name[0]?.toUpperCase() ?? '?');
}

const Avatar: React.FC<{ name: string }> = ({ name }) => (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
        {initials(name)}
    </div>
);

// Branch entity'si backend’den farklı şekillerde gelebileceği için any üzerinden
// olası property isimlerini tek yerde topluyoruz.
function mapBranchToItem(b: Branch, defaultBranch?: string): BranchItem {
    const anyB = b as any;
    const name: string = anyB.name ?? '';

    const lastCommitAt =
        anyB.lastCommitAt ??
        anyB.latestCommitAt ??
        (anyB.commit?.committedAt
            ? new Date(anyB.commit.committedAt).toLocaleString()
            : undefined);

    const lastCommitMessage: string | undefined =
        // backend branch tablosunda olabilir
        anyB.lastCommitMessage ??
        anyB.latestCommitMessage ??
        // commit alanı embed edilmişse
        anyB.commit?.message ??
        undefined;

    return {
        id: String(anyB.id ?? name),
        name,
        isDefault: defaultBranch ? name === defaultBranch : undefined,
        lastCommitAt,
        lastCommitMessage,
    };
}

function mapCommitToItem(c: Commit, branchName: string): CommitItem {
    const anyC = c as any;
    return {
        sha: anyC.sha ?? '',
        message: anyC.message ?? '',
        author: anyC.authorLogin || anyC.authorName || 'unknown',
        date: anyC.committedAt ? new Date(anyC.committedAt).toLocaleString() : '',
        url: anyC.htmlUrl || anyC.url || '#',
        branch: branchName,
    };
}

/* ---------- Page ---------- */
const RepoDetailPage: React.FC = () => {
    const { repoId } = useParams<{ repoId: string }>();
    const location = useLocation();
    const state = location.state as { repo?: Repo } | null;

    const [repo, setRepo] = useState<Repo | null>(state?.repo ?? null);
    const [isLoadingRepo, setIsLoadingRepo] = useState(false);
    const [repoError, setRepoError] = useState<string | null>(null);

    const [branches, setBranches] = useState<BranchItem[]>([]);
    const [isLoadingBranches, setIsLoadingBranches] = useState(false);
    const [branchesError, setBranchesError] = useState<string | null>(null);

    const [commits, setCommits] = useState<CommitItem[]>([]);
    const [isLoadingCommits, setIsLoadingCommits] = useState(false);
    const [commitsError, setCommitsError] = useState<string | null>(null);

    const [activeTab, setActiveTab] =
        useState<'overview' | 'commits' | 'branches' | 'languages'>('overview');
    const [branchFilter, setBranchFilter] = useState<string>('all');

    /* ---------- 1) Repo'yu bul ---------- */
    useEffect(() => {
        if (repo || !repoId) return;

        const fetchRepo = async () => {
            try {
                setIsLoadingRepo(true);
                setRepoError(null);
                const all = await getUserRepos();
                const found =
                    all.find((r) => String(r.id) === String(repoId)) ?? null;
                if (!found) {
                    setRepoError('Repository not found.');
                }
                setRepo(found);
            } catch (e) {
                console.error('❌ Failed to load repo:', e);
                setRepoError('Repository could not be loaded.');
            } finally {
                setIsLoadingRepo(false);
            }
        };

        fetchRepo();
    }, [repo, repoId]);

    /* ---------- 2) Branchleri init + query ---------- */
    useEffect(() => {
        if (!repo?.fullName) return;

        const loadBranches = async () => {
            try {
                setIsLoadingBranches(true);
                setBranchesError(null);

                // 1) Önce DB’den oku
                let branchEntities = await getBranchesByRepo(repo.fullName);

                // 2) Hiç yoksa init et, sonra tekrar oku (Postman flow’u)
                if (!branchEntities.length) {
                    await initBranchesByRepo(repo.fullName);
                    branchEntities = await getBranchesByRepo(repo.fullName);
                }

                const mapped = branchEntities.map((b) =>
                    mapBranchToItem(b, repo.defaultBranch ?? undefined),
                );
                setBranches(mapped);
            } catch (err) {
                console.error('❌ Failed to load branches', err);
                setBranches([]);
                setBranchesError('Branches could not be loaded.');
            } finally {
                setIsLoadingBranches(false);
            }
        };

        loadBranches();
    }, [repo]);

    /* ---------- 3) Commitleri init + query ---------- */
    useEffect(() => {
        if (!repo?.fullName || branches.length === 0) return;

        const fetchCommits = async () => {
            try {
                setIsLoadingCommits(true);
                setCommitsError(null);

                const fullName = repo.fullName;

                const targetBranches =
                    branchFilter === 'all'
                        ? branches.map((b) => b.name)
                        : [branchFilter];

                const all: CommitItem[] = [];

                for (const br of targetBranches) {
                    // init
                    await initCommits(fullName, br);
                    // query
                    const commitEntities: Commit[] = await queryCommits(
                        fullName,
                        br,
                    );
                    all.push(...commitEntities.map((c) => mapCommitToItem(c, br)));
                }

                // tarihe göre sort (string olduğundan çok takılma, UI için yeterli)
                all.sort((a, b) => (a.date < b.date ? 1 : -1));

                setCommits(all);
            } catch (e) {
                console.error('❌ Failed to load commits:', e);
                setCommits([]);
                setCommitsError('Commits could not be loaded.');
            } finally {
                setIsLoadingCommits(false);
            }
        };

        fetchCommits();
    }, [repo?.fullName, branches, branchFilter]);

    /* ---------- Derived values ---------- */
    const lastUpdatedLabel = useMemo(() => {
        if (!repo) return '—';
        const src = repo.pushedAt || repo.updatedAt || repo.createdAt;
        if (!src) return '—';
        const d = new Date(src);
        return d.toLocaleString();
    }, [repo]);

    const repoLanguage = repo?.language ?? 'Unknown';
    const stars = repo?.stargazers ?? 0;
    const forks = repo?.forks ?? 0;
    const watchers = repo?.watchers ?? 0;
    const openIssues = repo?.openIssues ?? 0;
    const sizeMB = repo?.size ? Math.round(repo.size / 1024) : 0;

    /* ---------- Render ---------- */

    if (isLoadingRepo && !repo) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
                Loading repository…
            </div>
        );
    }

    if (!repo) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-red-500">
                {repoError ?? 'Repository not found.'}
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/70 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                    <div className="flex flex-col text-sm">
                        <span className="text-xs text-slate-500">Repositories</span>
                        <span className="font-medium text-slate-800">
                            {repo.fullName ?? repo.name}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500">
                        Last updated: {lastUpdatedLabel}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                <div className="space-y-6">
                    {/* Top Overview Card */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
                        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                            {/* left */}
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
                                    {repo.fullName ?? repo.name}
                                </h1>
                                {repo.description && (
                                    <p className="mt-1 text-slate-600">
                                        {repo.description}
                                    </p>
                                )}

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                                    <ChipDot label={repoLanguage} color="#F97316" />
                                    <Chip
                                        icon={<Star className="h-4 w-4" />}
                                        label={`${stars} stars`}
                                    />
                                    <Chip
                                        icon={<GitFork className="h-4 w-4" />}
                                        label={`${forks} forks`}
                                    />
                                    <Chip
                                        icon={<Eye className="h-4 w-4" />}
                                        label={`${watchers} watchers`}
                                    />
                                    <Chip
                                        icon={<AlertCircle className="h-4 w-4" />}
                                        label={`${openIssues} open issues`}
                                    />
                                    <Chip
                                        icon={<Info className="h-4 w-4" />}
                                        label={`${sizeMB} MB`}
                                    />
                                    <Chip
                                        icon={<GitBranchIcon className="h-4 w-4" />}
                                        label={`default: ${repo.defaultBranch ?? '-'}`}
                                    />
                                </div>
                            </div>

                            {/* right actions */}
                            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
                                <PillButton
                                    as="a"
                                    href={repo.htmlUrl ?? '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View on GitHub
                                </PillButton>
                                <PillButton
                                    onClick={async () => {
                                        if (!repo.fullName) return;
                                        await initBranchesByRepo(repo.fullName);
                                        await getBranchesByRepo(repo.fullName);
                                        // sonra useEffect zaten tekrar tetikleniyor
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Sync Branches
                                </PillButton>
                                <PillButton
                                    onClick={async () => {
                                        if (!repo.fullName || branches.length === 0) return;
                                        const targetBranches =
                                            branchFilter === 'all'
                                                ? branches.map((b) => b.name)
                                                : [branchFilter];
                                        for (const br of targetBranches) {
                                            await initCommits(repo.fullName, br);
                                            await queryCommits(repo.fullName, br);
                                        }
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Sync Commits
                                </PillButton>
                            </div>
                        </div>

                        <div className="mt-2 text-right text-xs text-slate-500">
                            Last Sync (commits):{' '}
                            {isLoadingCommits ? 'Syncing…' : 'via dashboard-style view'}
                        </div>
                    </section>

                    {/* Tabs container */}
                    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                        {/* pill tab bar */}
                        <div className="flex items-center gap-2 p-3">
                            <TabPill
                                active={activeTab === 'overview'}
                                onClick={() => setActiveTab('overview')}
                                label="Overview"
                            />
                            <TabPill
                                active={activeTab === 'commits'}
                                onClick={() => setActiveTab('commits')}
                                label="Commits"
                            />
                            <TabPill
                                active={activeTab === 'branches'}
                                onClick={() => setActiveTab('branches')}
                                label="Branches"
                            />
                            <TabPill
                                active={activeTab === 'languages'}
                                onClick={() => setActiveTab('languages')}
                                label="Languages"
                            />
                            <div className="ml-auto pr-1 text-xs text-slate-500">
                                Last Updated: {lastUpdatedLabel}
                            </div>
                        </div>

                        {/* content */}
                        <div className="border-t border-slate-200 p-4">
                            {activeTab === 'overview' && (
                                <OverviewTab
                                    lastUpdated={lastUpdatedLabel}
                                    defaultBranch={repo.defaultBranch ?? '-'}
                                    branchesCount={branches.length}
                                    commitsCount={commits.length}
                                />
                            )}

                            {activeTab === 'commits' && (
                                <CommitsTab
                                    commits={commits}
                                    branches={branches}
                                    branchFilter={branchFilter}
                                    setBranchFilter={setBranchFilter}
                                    isLoading={isLoadingCommits || isLoadingBranches}
                                    error={commitsError || branchesError}
                                />
                            )}

                            {activeTab === 'branches' && (
                                <BranchesTab
                                    branches={branches}
                                    defaultBranch={repo.defaultBranch ?? 'main'}
                                    repoId={repo.id}
                                />
                            )}

                            {activeTab === 'languages' && (
                                <LanguagesTab languages={LANGUAGES} />
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <footer className="mt-10 border-t border-slate-200 bg-white/70 py-3 text-center text-xs text-slate-500 backdrop-blur">
                footer placeholder
            </footer>
        </>
    );
};

export default RepoDetailPage;

/* ---------- Chips / Buttons ---------- */
const PillButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { as?: 'a' | 'button' }
> = ({ as = 'button', children, ...rest }) => {
    const common =
        'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50';
    return as === 'a' ? (
        <a {...(rest as any)} className={common}>
            {children}
        </a>
    ) : (
        <button {...(rest as any)} className={common}>
            {children}
        </button>
    );
};

const Chip: React.FC<{ icon?: React.ReactNode; label: string }> = ({
    icon,
    label,
}) => (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
        {icon}
        {label}
    </span>
);

const ChipDot: React.FC<{ label: string; color: string }> = ({
    label,
    color,
}) => (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700">
        <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
        />
        {label}
    </span>
);

const TabPill: React.FC<{
    active: boolean;
    label: string;
    onClick: () => void;
}> = ({ active, label, onClick }) => (
    <button
        onClick={onClick}
        className={
            'rounded-full px-3 py-1.5 text-sm transition ' +
            (active
                ? 'bg-slate-900/5 text-slate-900 ring-1 ring-slate-300'
                : 'text-slate-600 hover:bg-slate-50')
        }
    >
        {label}
    </button>
);

/* ---------- Tabs ---------- */

const OverviewTab: React.FC<{
    branchesCount: number;
    commitsCount: number;
    lastUpdated: string;
    defaultBranch: string;
}> = ({ branchesCount, commitsCount, lastUpdated, defaultBranch }) => {
    const kpis = [
        { label: 'Branches', value: String(branchesCount) },
        { label: 'Commits (loaded)', value: String(commitsCount) },
        { label: 'Last Updated', value: lastUpdated },
        { label: 'Default Branch', value: defaultBranch },
    ];
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((k) => (
                    <div
                        key={k.label}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                        <div className="text-xs text-slate-500">{k.label}</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                            {k.value}
                        </div>
                    </div>
                ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                Owner/Org context placeholder • Keep dashboard-style spacing and
                soft visuals.
            </div>
        </div>
    );
};

const CommitsTab: React.FC<{
    commits: CommitItem[];
    branches: BranchItem[];
    branchFilter: string;
    setBranchFilter: (b: string) => void;
    isLoading?: boolean;
    error?: string | null;
}> = ({ commits, branches, branchFilter, setBranchFilter }) => {
    return (
        <div className="grid gap-4 lg:grid-cols-5">
            {/* left: search + list */}
            <div className="lg:col-span-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <Search className="h-4 w-4 text-slate-500" />
                            <input
                                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                                placeholder="Search commits…"
                            />
                        </div>
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                            <option value="all">All branches</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.name}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-3 max-h-80 overflow-y-auto pr-1">
                        <ul className="divide-y divide-slate-200">
                            {commits.map((c) => (
                                <li key={c.sha} className="flex items-center gap-3 py-3">
                                    <Avatar name={c.author} />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-800">
                                            {c.message}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                            <span>{c.date}</span>
                                            {c.branch === 'master' && (
                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                                        <span className="font-mono">{c.sha}</span>
                                        <a
                                            href={c.url}
                                            className="text-slate-400 hover:text-slate-600"
                                            title="Open on GitHub"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* right: branches summary (compact) */}
            <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-medium text-slate-800">Branches</h4>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <ul className="space-y-2">
                        {branches.map((b) => (
                            <li
                                key={b.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <GitBranchIcon className="h-4 w-4 text-slate-500" />
                                    <span className="font-medium text-slate-800">
                                        {b.name}
                                    </span>
                                    {b.isDefault && (
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                                            Default
                                        </span>
                                    )}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {b.lastCommitAt}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {/* küçük language progress */}
                    <div className="mt-4 space-y-2">
                        {['Java', 'C++', 'Python', 'JavaScript', 'Other'].map((name) => {
                            const l = LANGUAGES.find((x) => x.name === name)!;
                            return (
                                <div key={name}>
                                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                                        <span className="inline-flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: l.color }}
                                            />
                                            {l.name}
                                        </span>
                                        <span className="text-slate-500">{l.percent}%</span>
                                    </div>
                                    <div className="h-2.5 w-full rounded-full bg-slate-100">
                                        <div
                                            className="h-2.5 rounded-full"
                                            style={{
                                                width: `${l.percent}%`,
                                                backgroundColor: l.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                        Data from default branch
                    </div>
                </div>
            </div>
        </div>
    );
};

type BranchesTabProps = {
    branches: BranchItem[];
    defaultBranch: string;
    repoId?: string | number;
};

const BranchesTab: React.FC<BranchesTabProps> = ({
    branches,
    defaultBranch,
    repoId,
}) => (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                    <th className="px-4 py-2">Branch</th>
                    <th className="px-4 py-2">Last Commit</th>
                    <th className="px-4 py-2" />
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
                {branches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-2">
                                <GitBranchIcon className="h-4 w-4 text-slate-500" />
                                <span className="font-medium text-slate-800">
                                    {b.name}
                                </span>
                                {b.name === defaultBranch && (
                                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                                        default
                                    </span>
                                )}
                            </span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                            {/* 👇 burada artık son commit mesajını gösteriyoruz */}
                            {b.lastCommitMessage ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                            {repoId ? (
                                <Link
                                    to={`/repositories/${encodeURIComponent(
                                        String(repoId),
                                    )}/branches/${encodeURIComponent(
                                        b.name,
                                    )}/commits`}
                                    state={{ branchName: b.name }}
                                    className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800"
                                >
                                    View commits
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            ) : (
                                <span className="text-xs text-slate-400">
                                    View commits
                                </span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const LanguagesTab: React.FC<{ languages: LanguageShare[] }> = ({
    languages,
}) => (
    <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
            {languages.map((l) => (
                <div key={l.name}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span className="inline-flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: l.color }}
                            />
                            {l.name}
                        </span>
                        <span className="text-slate-500">{l.percent}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100">
                        <div
                            className="h-2.5 rounded-full"
                            style={{ width: `${l.percent}%`, backgroundColor: l.color }}
                        />
                    </div>
                </div>
            ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
            <div className="mb-2 font-medium text-slate-800">Legend</div>
            <ul className="space-y-1">
                {languages.map((l) => (
                    <li key={l.name} className="flex items-center gap-2">
                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: l.color }}
                        />
                        <span>{l.name}</span>
                        <span className="ml-auto text-slate-500">
                            {l.percent}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);
