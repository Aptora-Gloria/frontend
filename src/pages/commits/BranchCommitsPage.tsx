// src/pages/commits/BranchCommitsPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
    ChevronLeft,
    GitBranch,
    Search,
    Clock,
    User as UserIcon,
    ExternalLink,
} from 'lucide-react';

import type { Repo } from '@/entities/repo';
import type { Commit } from '@/entities/commit';
import { getUserRepos } from '@/shared/lib/repo-api';
import { queryCommits, initCommits } from '@/shared/lib/commit-api';

type RouteParams = {
    repoId: string;
    branchName: string;
};

type LocationState = {
    repo?: Repo;
    branchName?: string;
};

export default function BranchCommitsPage() {
    const { repoId, branchName: branchParam } = useParams<RouteParams>();
    const location = useLocation();
    const { repo: stateRepo, branchName: stateBranch } =
        (location.state as LocationState | null) ?? {};

    const [repo, setRepo] = useState<Repo | null>(stateRepo ?? null);
    const [branchName] = useState<string>(stateBranch ?? branchParam ?? 'main');

    const [commits, setCommits] = useState<Commit[]>([]);
    const [selectedSha, setSelectedSha] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1) Repo bilgisi yoksa (sayfaya direkt URL ile girilirse) repoyu getir
    useEffect(() => {
        if (stateRepo) return;

        const loadRepo = async () => {
            try {
                const data = await getUserRepos();
                const found =
                    data.find((r) => String(r.id) === String(repoId)) ?? null;
                setRepo(found);
            } catch (e) {
                console.error('❌ Failed to load repo in BranchCommitsPage:', e);
            }
        };

        loadRepo();
    }, [stateRepo, repoId]);

    // 2) Seçili repo + branch için commitleri getir
    useEffect(() => {
        const loadCommits = async () => {
            if (!repo || !branchName) return;
            if (!repo.fullName) return;

            try {
                setIsLoading(true);
                setError(null);

                const fullName = repo.fullName;
                let data = await queryCommits(fullName, branchName);

                if (!data.length) {
                    await initCommits(fullName, branchName);
                    data = await queryCommits(fullName, branchName);
                }

                setCommits(data);
                if (!selectedSha && data.length) {
                    setSelectedSha(data[0].sha);
                }
            } catch (e) {
                console.error('❌ Failed to load branch commits:', e);
                setError('Commits could not be loaded.');
                setCommits([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadCommits();
    }, [repo, branchName, selectedSha]);

    // 3) Search filtresi
    const filteredCommits = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return commits;

        return commits.filter((c) => {
            const msg = c.message ?? '';
            const author =
                c.authorLogin ?? c.authorName ?? '';
            return (
                msg.toLowerCase().includes(q) ||
                author.toLowerCase().includes(q)
            );
        });
    }, [commits, search]);

    // 4) Sağ taraftaki aktif commit (detay paneli)
    const activeCommit = useMemo(() => {
        if (!filteredCommits.length) return null;
        const current =
            filteredCommits.find((c) => c.sha === selectedSha) ??
            filteredCommits[0];
        return current;
    }, [filteredCommits, selectedSha]);

    const repoName = repo?.fullName ?? repo?.name ?? 'Repository';

    const activeLink = (() => {
        const ac: any = activeCommit;
        return ac?.htmlUrl ?? ac?.url ?? '#';
    })();

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-6 space-y-4">
                {/* HEADER BAR */}
                <div className="flex items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {repoName[0]?.toUpperCase() ?? 'R'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500">
                                Branch commits
                            </span>
                            <span className="text-sm font-medium text-slate-800">
                                {repoName}
                            </span>
                        </div>
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            <GitBranch className="h-3 w-3" />
                            {branchName}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600">
                        {/* ahead/behind şimdilik placeholder – backend’den gelince doldurulur */}
                        <span className="hidden sm:inline">
                            Ahead by 0
                        </span>
                        <span className="hidden sm:inline">
                            Behind by 0
                        </span>

                        <button
                            type="button"
                            className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 sm:inline-flex"
                        >
                            Date Range: Last 30 days
                        </button>

                        <Link
                            to={`/repositories/${encodeURIComponent(
                                String(repo?.id ?? repoId),
                            )}`}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                            <ChevronLeft className="h-3 w-3" />
                            Back to repository
                        </Link>
                    </div>
                </div>

                {/* MAIN 2 COLUMN LAYOUT */}
                <div className="grid gap-4 lg:grid-cols-5">
                    {/* LEFT: commit list / timeline */}
                    <div className="lg:col-span-3">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <Search className="h-4 w-4 text-slate-400" />
                                    <input
                                        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                                        placeholder="Search commits…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 sm:inline-flex"
                                >
                                    Author
                                </button>
                            </div>

                            <div className="relative mt-2 max-h-[480px] overflow-y-auto pr-2">
                                {/* timeline çizgisi */}
                                <div className="pointer-events-none absolute left-8 top-0 h-full w-px bg-slate-200" />

                                <ul className="space-y-3">
                                    {isLoading && !filteredCommits.length && (
                                        <li className="text-xs text-slate-400">
                                            Loading commits…
                                        </li>
                                    )}

                                    {!isLoading &&
                                        !filteredCommits.length &&
                                        !error && (
                                            <li className="text-xs text-slate-500">
                                                No commits found for this branch.
                                            </li>
                                        )}

                                    {error && (
                                        <li className="text-xs text-red-500">{error}</li>
                                    )}

                                    {filteredCommits.map((c) => {
                                        const isActive = activeCommit?.sha === c.sha;
                                        const authorLabel =
                                            c.authorLogin ?? c.authorName ?? 'unknown';
                                        const dateLabel = c.committedAt
                                            ? new Date(
                                                c.committedAt,
                                            ).toLocaleString()
                                            : 'unknown time';

                                        return (
                                            <li key={c.sha} className="relative pl-4">
                                                {/* timeline dot */}
                                                <div className="absolute left-7 top-6 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-slate-300" />

                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSha(c.sha)}
                                                    className={[
                                                        'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left shadow-sm transition',
                                                        isActive
                                                            ? 'border-sky-200 bg-sky-50/80 ring-1 ring-sky-200'
                                                            : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40',
                                                    ].join(' ')}
                                                >
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                                        {authorLabel[0]?.toUpperCase() ?? 'A'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium text-slate-800">
                                                            {c.message || '(no message)'}
                                                        </div>
                                                        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                                                            <span className="inline-flex items-center gap-1">
                                                                <UserIcon className="h-3 w-3" />
                                                                {authorLabel}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {dateLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 text-xs text-slate-500">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                                            <GitBranch className="h-3 w-3" />
                                                            {branchName}
                                                        </span>
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono">
                                                            {c.sha.slice(0, 7)}
                                                        </span>
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: commit details panel */}
                    <div className="lg:col-span-2">
                        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h2 className="mb-2 text-sm font-semibold text-slate-800">
                                Commit Details
                                {activeCommit && (
                                    <span className="ml-2 font-mono text-xs text-sky-600">
                                        {activeCommit.sha.slice(0, 10)}
                                    </span>
                                )}
                            </h2>

                            {!activeCommit && (
                                <p className="mt-4 text-xs text-slate-500">
                                    Select a commit from the left to see details.
                                </p>
                            )}

                            {activeCommit && (
                                <>
                                    <div className="space-y-1 border-b border-slate-100 pb-3">
                                        <h3 className="text-sm font-medium text-slate-900">
                                            {activeCommit.message ||
                                                '(no commit message)'}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {activeCommit.authorName ||
                                                activeCommit.authorLogin ||
                                                'Unknown author'}
                                        </p>
                                    </div>

                                    <div className="mt-3 space-y-2 text-xs text-slate-600">
                                        <div>
                                            <span className="font-medium">
                                                Date / Time:
                                            </span>{' '}
                                            {activeCommit.committedAt
                                                ? new Date(
                                                    activeCommit.committedAt,
                                                ).toLocaleString()
                                                : 'unknown'}
                                        </div>
                                        {activeCommit.sha && (
                                            <div>
                                                <span className="font-medium">
                                                    Full SHA:
                                                </span>{' '}
                                                <span className="font-mono">
                                                    {activeCommit.sha}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="font-medium">Branch:</span>{' '}
                                            {branchName}
                                        </div>
                                        {activeLink && activeLink !== '#' && (
                                            <div>
                                                <a
                                                    href={activeLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    View on GitHub
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Placeholder diff / files changed alanı */}
                                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                                        <div className="mb-1 text-xs font-medium text-slate-700">
                                            Files changed
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Detailed diff preview is not implemented yet.
                                            You can open this commit on GitHub to see the
                                            full changes.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
