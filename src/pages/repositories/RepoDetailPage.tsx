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
import { Avatar, Chip, ChipDot, PillButton, TabPill } from '@/shared/ui';

/* ---------- Language Color Map ---------- */
const LANG_COLOR: Record<string, string> = {
    JavaScript: '#FCD34D',
    TypeScript: '#60A5FA',
    Python: '#34D399',
    'C++': '#A78BFA',
    Java: '#F97316',
    Markdown: '#94A3B8',
    Default: '#CBD5E1',
};

/* ---------- Map entity to UI types ---------- */

function mapBranchToItem(b: Branch, defaultBranch?: string) {
    const anyB = b as any;

    const lastCommitAt =
        anyB.lastCommitAt ??
        anyB.latestCommitAt ??
        (anyB.commit?.committedAt
            ? new Date(anyB.commit.committedAt).toLocaleString()
            : undefined);

    return {
        id: String(anyB.id ?? anyB.name),
        name: anyB.name ?? '',
        isDefault: defaultBranch ? anyB.name === defaultBranch : undefined,
        lastCommitAt,
        lastCommitMessage:
            anyB.lastCommitMessage ??
            anyB.latestCommitMessage ??
            anyB.commit?.message ??
            undefined,
    };
}

function mapCommitToItem(c: Commit, branchName: string) {
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

export default function RepoDetailPage() {
    const { repoId } = useParams<{ repoId: string }>();
    const location = useLocation();
    const state = location.state as { repo?: Repo } | null;

    const [repo, setRepo] = useState<Repo | null>(state?.repo ?? null);

    const [branches, setBranches] = useState<any[]>([]);
    const [commits, setCommits] = useState<any[]>([]);

    const [isLoadingRepo, setIsLoadingRepo] = useState(false);
    const [repoError, setRepoError] = useState<string | null>(null);

    const [isLoadingBranches, setIsLoadingBranches] = useState(false);
    const [branchesError, setBranchesError] = useState<string | null>(null);

    const [isLoadingCommits, setIsLoadingCommits] = useState(false);
    const [commitsError, setCommitsError] = useState<string | null>(null);

    const [activeTab, setActiveTab] =
        useState<'overview' | 'commits' | 'branches'>('overview');
    const [branchFilter, setBranchFilter] = useState<string>('all');

    /* ---------- 1) Repo yükle ---------- */
    useEffect(() => {
        if (repo || !repoId) return;

        const fetchRepo = async () => {
            try {
                setIsLoadingRepo(true);
                const all = await getUserRepos();
                const found = all.find((r) => String(r.id) === String(repoId)) ?? null;

                if (!found) setRepoError('Repository not found.');
                setRepo(found);
            } catch (e) {
                setRepoError('Repository could not be loaded.');
            } finally {
                setIsLoadingRepo(false);
            }
        };

        fetchRepo();
    }, [repo, repoId]);

    /* ---------- 2) Branch yükle ---------- */
    useEffect(() => {
        if (!repo?.fullName) return;

        const loadBranches = async () => {
            try {
                setIsLoadingBranches(true);

                let list = await getBranchesByRepo(repo.fullName);
                if (!list.length) {
                    await initBranchesByRepo(repo.fullName);
                    list = await getBranchesByRepo(repo.fullName);
                }

                setBranches(list.map((b) => mapBranchToItem(b, repo.defaultBranch ?? undefined)));
            } catch (e) {
                setBranchesError('Branches could not be loaded.');
                setBranches([]);
            } finally {
                setIsLoadingBranches(false);
            }
        };

        loadBranches();
    }, [repo]);

    /* ---------- 3) Commit yükle ---------- */
    useEffect(() => {
        if (!repo?.fullName || branches.length === 0) return;

        const fetchCommits = async () => {
            try {
                setIsLoadingCommits(true);

                const branchNames =
                    branchFilter === 'all'
                        ? branches.map((b) => b.name)
                        : [branchFilter];

                const all: any[] = [];

                for (const br of branchNames) {
                    await initCommits(repo.fullName, br);
                    const data = await queryCommits(repo.fullName, br);
                    all.push(...data.map((c) => mapCommitToItem(c, br)));
                }

                all.sort((a, b) => (a.date < b.date ? 1 : -1));
                setCommits(all);
            } catch (e) {
                setCommitsError('Commits could not be loaded.');
                setCommits([]);
            } finally {
                setIsLoadingCommits(false);
            }
        };

        fetchCommits();
    }, [repo, branches, branchFilter]);

    /* ---------- Derived ---------- */
    const lastUpdatedLabel = useMemo(() => {
        if (!repo) return '—';
        const src = repo.pushedAt || repo.updatedAt || repo.createdAt;
        if (!src) return '—';
        return new Date(src).toLocaleString();
    }, [repo]);

    const repoLanguage = repo?.language ?? 'Unknown';
    const languageColor = LANG_COLOR[repoLanguage] ?? LANG_COLOR.Default;

    /* ---------- Loading states ---------- */
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

    /* ---------- Render UI ---------- */

    return (
        <>
            {/* HEADER */}
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/70 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                    <div className="flex flex-col text-sm">
                        <span className="text-xs text-slate-500">Repositories</span>
                        <span className="font-medium text-slate-800">{repo.fullName}</span>
                    </div>
                    <div className="text-xs text-slate-500">Last updated: {lastUpdatedLabel}</div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                <div className="space-y-6">
                    {/* TOP CARD */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
                        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
                            <div className="min-w-0">
                                <h1 className="truncate text-2xl font-semibold text-slate-900">
                                    {repo.fullName}
                                </h1>
                                {repo.description && (
                                    <p className="mt-1 text-slate-600">{repo.description}</p>
                                )}

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                                    <ChipDot label={repoLanguage} dotColor={languageColor} />

                                    <Chip icon={<Star className="h-4 w-4" />} label={`${repo.stargazers ?? 0} stars`} />
                                    <Chip icon={<GitFork className="h-4 w-4" />} label={`${repo.forks ?? 0} forks`} />
                                    <Chip icon={<Eye className="h-4 w-4" />} label={`${repo.watchers ?? 0} watchers`} />
                                    <Chip icon={<AlertCircle className="h-4 w-4" />} label={`${repo.openIssues ?? 0} issues`} />
                                    <Chip icon={<Info className="h-4 w-4" />} label={`${Math.round((repo.size ?? 0) / 1024)} MB`} />
                                    <Chip icon={<GitBranchIcon className="h-4 w-4" />} label={`default: ${repo.defaultBranch ?? '-'}`} />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                    </section>

                    {/* TABS */}
                    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
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

                            <div className="ml-auto pr-1 text-xs text-slate-500">
                                Last Updated: {lastUpdatedLabel}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 p-4">
                            {/* OVERVIEW */}
                            {activeTab === 'overview' && (
                                <OverviewTab
                                    lastUpdated={lastUpdatedLabel}
                                    branchesCount={branches.length}
                                    commitsCount={commits.length}
                                    defaultBranch={repo.defaultBranch ?? '-'}
                                />
                            )}

                            {/* COMMITS */}
                            {activeTab === 'commits' && (
                                <CommitsTab
                                    commits={commits}
                                    branches={branches}
                                    branchFilter={branchFilter}
                                    setBranchFilter={setBranchFilter}
                                    isLoading={isLoadingCommits}
                                    error={commitsError}
                                />
                            )}

                            {/* BRANCHES */}
                            {activeTab === 'branches' && (
                                <BranchesTab
                                    branches={branches}
                                    defaultBranch={repo.defaultBranch ?? 'main'}
                                    repoId={repo.id}
                                />
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <footer className="mt-10 border-t border-slate-200 bg-white/70 py-3 text-center text-xs text-slate-500">
                footer placeholder
            </footer>
        </>
    );
}

/* ---------- Overview Tab ---------- */
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
                    <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs text-slate-500">{k.label}</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{k.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ---------- Commits Tab ---------- */
const CommitsTab: React.FC<{
    commits: any[];
    branches: any[];
    branchFilter: string;
    setBranchFilter: (b: string) => void;
    isLoading?: boolean;
    error?: string | null;
}> = ({ commits, branches, branchFilter, setBranchFilter, isLoading, error }) => (
    <div className="grid gap-4 lg:grid-cols-5">
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
                    {isLoading && <p className="text-xs text-slate-400">Loading commits…</p>}
                    {error && <p className="text-xs text-red-500">{error}</p>}

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
                                    <span className="font-mono">{c.sha.slice(0, 7)}</span>
                                    <a
                                        href={c.url}
                                        className="text-slate-400 hover:text-slate-600"
                                        target="_blank"
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

        <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-800">Branches</h4>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>

                <ul className="space-y-2">
                    {branches.map((b) => (
                        <li key={b.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                            <span className="inline-flex items-center gap-2">
                                <GitBranchIcon className="h-4 w-4 text-slate-500" />
                                <span className="font-medium text-slate-800">{b.name}</span>

                                {b.isDefault && (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                                        Default
                                    </span>
                                )}
                            </span>
                            <span className="text-xs text-slate-500">{b.lastCommitAt}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
);

/* ---------- Branches Tab ---------- */
const BranchesTab: React.FC<{
    branches: any[];
    defaultBranch: string;
    repoId?: string | number;
}> = ({ branches, defaultBranch, repoId }) => (
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
                                <span className="font-medium text-slate-800">{b.name}</span>

                                {b.name === defaultBranch && (
                                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                                        default
                                    </span>
                                )}
                            </span>
                        </td>

                        <td className="px-4 py-2 text-slate-600">
                            {b.lastCommitMessage ?? '—'}
                        </td>

                        <td className="px-4 py-2 text-right">
                            {repoId ? (
                                <Link
                                    to={`/repositories/${encodeURIComponent(
                                        String(repoId)
                                    )}/branches/${encodeURIComponent(b.name)}/commits`}
                                    state={{ branchName: b.name }}
                                    className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800"
                                >
                                    View commits
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            ) : (
                                <span className="text-xs text-slate-400">View commits</span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
