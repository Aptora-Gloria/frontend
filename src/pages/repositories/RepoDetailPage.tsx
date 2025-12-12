import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ExternalLink,
    RefreshCw,
    GitBranch,
    Star,
    GitFork,
    Eye,
    AlertCircle,
    Database,
    ArrowLeft,
    GitCommitHorizontal,
    Search,
    Copy,
    Check,
    FileText,
    ShieldCheck,
    Clock,
    Activity,
    Users,
    Code2,
    Lock,
    Unlock,
    Terminal,
    Zap,
    History,
    GitPullRequest, // EKLENDİ
    ArrowRight      // EKLENDİ
} from 'lucide-react';

import type { Repo } from '@/entities/repo';
import { getUserRepos } from '@/shared/lib/repo-api';
import { getBranchesByRepo, initBranchesByRepo } from '@/shared/lib/branch-api';
import { initCommits, queryCommits } from '@/shared/lib/commit-api';
import { queryPullRequests, initPullRequests } from '@/shared/lib/pr-api';
import type { PullRequest } from '@/entities/pull-request';
import { Avatar } from '@/shared/ui';
import { useToast } from '@/shared/contexts/ToastContext';
import { ErrorState } from '@/shared/ui/error-state';
import type { AppError } from '@/shared/errors';

/* ---------- Language Color Map ---------- */
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
    Default: '#94A3B8',
};

/* ---------- Helpers & Mappers ---------- */

function mapBranchToItem(b: any, defaultBranch?: string) {
    const rawDate = b.lastCommitAt ?? b.latestCommitAt ?? b.commit?.committedAt;
    return {
        id: String(b.id ?? b.name),
        name: b.name ?? '',
        isDefault: defaultBranch ? b.name === defaultBranch : false,
        lastCommitAt: rawDate ? new Date(rawDate).toLocaleString() : '—',
        lastCommitMessage: b.lastCommitMessage ?? b.latestCommitMessage ?? b.commit?.message ?? '—',
    };
}

function mapCommitToItem(c: any, branchName: string) {
    const message = c.message || c.commit?.message || 'No commit message';
    const authorName = c.authorName || c.commit?.author?.name || c.author?.login || 'Unknown';
    const authorLogin = c.authorLogin || c.author?.login || c.committer?.login || authorName;
    const dateStr = c.committedAt || c.date || c.commit?.author?.date || c.commit?.committer?.date;
    const dateObj = dateStr ? new Date(dateStr) : new Date();
    const url = c.htmlUrl || c.html_url || c.url || '#';

    return {
        sha: c.sha ?? '',
        message,
        authorName,
        authorLogin,
        date: dateObj.toLocaleString(),
        rawDate: dateObj,
        url,
        branch: branchName,
    };
}

function formatSize(kb: number): string {
    if (!kb) return '0 KB';
    if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
    return kb + ' KB';
}

/* ---------- UI Components ---------- */

const CopyButton = ({ text, className }: { text: string, className?: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className={`transition-colors ${className || 'text-slate-400 hover:text-slate-600'}`} title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
};

const TabButton = ({ active, label, count, onClick }: { active: boolean, label: string, count?: number, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors ${active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
    >
        {label}
        {count !== undefined && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-500'}`}>
                {count}
            </span>
        )}
        {active && (
            <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            />
        )}
    </button>
);

const StatBadge = ({ icon: Icon, label, value }: { icon: any, label?: string, value: string | number }) => (
    <div className="flex items-center gap-1.5 text-sm text-slate-600" title={label}>
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-900">{value}</span>
        {label && <span className="text-slate-500 hidden sm:inline">{label}</span>}
    </div>
);

const CommitTimelineItem = ({ commit }: { commit: any }) => (
    <div className="group relative flex gap-4 pb-8 last:pb-0">
        <div className="absolute left-[19px] top-8 bottom-0 w-px bg-slate-200 group-last:hidden" />
        <div className="relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
            <Avatar name={commit.authorLogin} className="h-8 w-8" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col pt-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-slate-900 leading-tight">
                        {commit.message}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{commit.authorName}</span>
                        <span>committed on {commit.date}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 border border-slate-200">
                            {commit.branch}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
                    <GitCommitHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono text-xs text-slate-600">{commit.sha.slice(0, 7)}</span>
                    <div className="h-3 w-px bg-slate-200" />
                    <CopyButton text={commit.sha} />
                    <a href={commit.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>
        </div>
    </div>
);

/* ---------- Main Page Component ---------- */

export default function RepoDetailPage() {
    const { repoId } = useParams<{ repoId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { showError, showSuccess } = useToast();
    const state = location.state as { repo?: Repo } | null;

    const [repo, setRepo] = useState<Repo | null>(state?.repo ?? null);
    const [branches, setBranches] = useState<any[]>([]);
    const [commits, setCommits] = useState<any[]>([]);
    // PR STATE EKLENDİ
    const [prs, setPrs] = useState<PullRequest[]>([]);

    const [isLoadingRepo, setIsLoadingRepo] = useState(false);
    const [isLoadingBranches, setIsLoadingBranches] = useState(false);
    const [isLoadingCommits, setIsLoadingCommits] = useState(false);
    const [isLoadingPrs, setIsLoadingPrs] = useState(false);

    // Error states
    const [repoError, setRepoError] = useState<AppError | null>(null);
    const [branchError, setBranchError] = useState<AppError | null>(null);
    const [commitError, setCommitError] = useState<AppError | null>(null);
    const [prError, setPrError] = useState<AppError | null>(null);

    // TAB GÜNCELLENDİ
    const [activeTab, setActiveTab] = useState<'overview' | 'commits' | 'branches' | 'pull-requests'>('overview');
    const [branchFilter, setBranchFilter] = useState<string>('all');

    // Retry handlers
    const handleRetryRepo = async () => {
        if (!repoId) return;
        setRepoError(null);
        try {
            setIsLoadingRepo(true);
            const all = await getUserRepos();
            const found = all.find((r) => String(r.id) === String(repoId)) ?? null;
            setRepo(found);
        } catch (error) {
            const appError = error as AppError;
            setRepoError(appError);
            showError('Failed to load repository details.');
        } finally {
            setIsLoadingRepo(false);
        }
    };

    const handleRetryBranches = async () => {
        if (!repo?.fullName) return;
        setBranchError(null);
        try {
            setIsLoadingBranches(true);
            let list = await getBranchesByRepo(repo.fullName);
            if (!list.length) {
                await initBranchesByRepo(repo.fullName);
                list = await getBranchesByRepo(repo.fullName);
            }
            setBranches(list.map((b) => mapBranchToItem(b, repo.defaultBranch ?? undefined)));
        } catch (error) {
            const appError = error as AppError;
            setBranchError(appError);
            showError('Failed to load branches.');
        } finally {
            setIsLoadingBranches(false);
        }
    };

    const handleRetryCommits = async () => {
        if (!repo?.fullName || !branches.length) return;
        setCommitError(null);
        // Commit loading logic buraya gelecek - mevcut useEffect'teki logic'i kopyala
    };

    const handleRetryPrs = async () => {
        if (!repo?.fullName) return;
        setPrError(null);
        try {
            setIsLoadingPrs(true);
            let data = await queryPullRequests(repo.fullName, 'all');
            if (data.length === 0) {
                data = await initPullRequests(repo.fullName, 'all');
            }
            setPrs(data);
        } catch (error) {
            const appError = error as AppError;
            setPrError(appError);
            showError('Failed to load pull requests.');
        } finally {
            setIsLoadingPrs(false);
        }
    };

    // 1. Repo Load
    useEffect(() => {
        if (repo || !repoId) return;
        const fetchRepo = async () => {
            try {
                setIsLoadingRepo(true);
                const all = await getUserRepos();
                const found = all.find((r) => String(r.id) === String(repoId)) ?? null;
                setRepo(found);
            } catch (error) {
                console.error('Failed to load repository:', error);
                const appError = error as AppError;
                setRepoError(appError);
                showError('Failed to load repository details.');
            } finally {
                setIsLoadingRepo(false);
            }
        };
        fetchRepo();
    }, [repo, repoId]);

    // 2. Branches Load
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
            } catch (error) {
                console.error('Failed to load branches:', error);
                const appError = error as AppError;
                setBranchError(appError);
                setBranches([]);
                showError('Failed to load branches.');
            } finally {
                setIsLoadingBranches(false);
            }
        };
        loadBranches();
    }, [repo]);

    // 3. Commits Load
    // 3. Commits Load (DÜZELTİLMİŞ VERSİYON)
    useEffect(() => {
        if (!repo?.fullName || branches.length === 0) return;

        const fetchCommits = async () => {
            try {
                setIsLoadingCommits(true);
                const branchNames = branchFilter === 'all' ? branches.map((b) => b.name) : [branchFilter];

                // Paralel olarak tüm branchler için istek atıyoruz
                const promises = branchNames.map(async (br) => {
                    try {
                        // Önce init etmeyi dene (Database'e kaydet)
                        await initCommits(repo.fullName, br);
                        // Sonra commitleri çek
                        const data = await queryCommits(repo.fullName, br);
                        return data.map((c: any) => mapCommitToItem(c, br));
                    } catch (err) {
                        // KRİTİK NOKTA: Eğer bir branch silinmişse veya hata verirse,
                        // sadece konsola uyarı yaz ve boş dizi döndür.
                        // Böylece tüm süreç patlamaz!
                        console.warn(`Branch '${br}' commitleri çekilemedi (silinmiş olabilir):`, err);
                        return [];
                    }
                });

                // Tüm sonuçları bekle (Hatalı olanlar [] döndürecek)
                const results = await Promise.all(promises);

                // İç içe dizileri tek bir diziye çevir (flat)
                const allRawCommits = results.flat();

                // Tekrarlanan commitleri (SHA'ya göre) temizle
                const uniqueMap = new Map();
                allRawCommits.forEach(item => {
                    if (!uniqueMap.has(item.sha)) {
                        uniqueMap.set(item.sha, item);
                    }
                });

                const uniqueCommits = Array.from(uniqueMap.values());
                // Tarihe göre yeniden eskiye sırala
                uniqueCommits.sort((a: any, b: any) => b.rawDate.getTime() - a.rawDate.getTime());

                setCommits(uniqueCommits);
            } catch (error) {
                console.error("Failed to fetch commits:", error);
                const appError = error as AppError;
                setCommitError(appError);
                setCommits([]);
                showError('Failed to load commits.');
            } finally {
                setIsLoadingCommits(false);
            }
        };

        fetchCommits();
    }, [repo, branches, branchFilter]);

    // 4. PR Load (YENİ EKLENDİ)
    useEffect(() => {
        if (!repo?.fullName) return;

        // Sadece PR tabı açıksa veya hiç veri yoksa çekmeye çalış
        if (activeTab === 'pull-requests' && prs.length === 0) {
            const fetchPrs = async () => {
                setIsLoadingPrs(true);
                try {
                    let data = await queryPullRequests(repo.fullName, 'all');
                    // Eğer veritabanı boşsa GitHub'dan çek
                    if (data.length === 0) {
                        data = await initPullRequests(repo.fullName, 'all');
                    }
                    setPrs(data);
                } catch (error) {
                    console.error("Failed to fetch pull requests:", error);
                    const appError = error as AppError;
                    setPrError(appError);
                    showError('Failed to load pull requests.');
                } finally {
                    setIsLoadingPrs(false);
                }
            };
            fetchPrs();
        }
    }, [repo, activeTab, prs.length]);


    const handleGoToBranch = (branchName: string) => {
        if (!repo) return;
        navigate(`/repositories/${repo.id}/branches/${encodeURIComponent(branchName)}/commits`, {
            state: { repo, branchName }
        });
    };

    const handleSync = async () => {
        if (!repo?.fullName) return;
        // Tüm verileri yenile
        await initBranchesByRepo(repo.fullName);
        await getBranchesByRepo(repo.fullName);
        // PR'ları da yenile
        const newPrs = await initPullRequests(repo.fullName, 'all');
        setPrs(newPrs);
    };

    const repoLanguage = repo?.language ?? 'Unknown';
    const languageColor = LANG_COLOR[repoLanguage] ?? LANG_COLOR.Default;
    const isPrivate = (repo as any)?.visibility === 'private' || (repo as any)?.private;

    if (isLoadingRepo && !repo) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
    if (!repo) return <div className="flex min-h-screen items-center justify-center text-sm text-red-500">Not found.</div>;

    return (
        <div className="min-h-screen bg-[#FAFBFC]">
            {/* HEADER */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-6">
                    <button
                        onClick={() => navigate('/repositories')}
                        className="mb-4 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        Back to Repositories
                    </button>

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                                    {isPrivate ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">{repo.fullName}</h1>
                                    <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor }} />
                                            {repoLanguage}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="flex items-center gap-1.5">
                                            <Database className="h-3.5 w-3.5" />
                                            {formatSize(repo.size ?? 0)}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-xs">Updated {new Date(repo.updatedAt ?? '').toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <a
                                href={repo.htmlUrl ?? '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                                GitHub
                            </a>
                            <button
                                onClick={handleSync}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-colors active:scale-95"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Sync Data
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-slate-100 pt-6">
                        <StatBadge icon={Star} label="stars" value={repo.stargazers ?? 0} />
                        <StatBadge icon={GitFork} label="forks" value={repo.forks ?? 0} />
                        <StatBadge icon={Eye} label="watchers" value={repo.watchers ?? 0} />
                        <StatBadge icon={AlertCircle} label="issues" value={repo.openIssues ?? 0} />
                        <StatBadge icon={GitPullRequest} label="pull requests" value={prs.length > 0 ? prs.length : '-'} />
                    </div>

                    <div className="mt-6 flex gap-6 border-b border-slate-200">
                        <TabButton active={activeTab === 'overview'} label="Overview" onClick={() => setActiveTab('overview')} />
                        <TabButton active={activeTab === 'commits'} label="Commits" count={commits.length > 0 ? commits.length : undefined} onClick={() => setActiveTab('commits')} />
                        <TabButton active={activeTab === 'branches'} label="Branches" count={branches.length > 0 ? branches.length : undefined} onClick={() => setActiveTab('branches')} />
                        <TabButton active={activeTab === 'pull-requests'} label="Pull Requests" count={prs.length > 0 ? prs.length : undefined} onClick={() => setActiveTab('pull-requests')} />
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <main className="mx-auto max-w-7xl px-6 py-8">
                {activeTab === 'overview' && <OverviewTabContent repo={repo} commits={commits} languageColor={languageColor} repoLanguage={repoLanguage} />}

                {/* Commits Tab (Mini View) */}
                {activeTab === 'commits' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                            <div className="relative max-w-sm flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Search commits..." className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">Filter Branch:</span>
                                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500">
                                    <option value="all">All Branches</option>
                                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                            {isLoadingCommits ? <div className="text-center py-10 text-slate-500">Loading commits timeline...</div> : commits.length === 0 ? <div className="text-center py-10 text-slate-500">No commits found. Click "Sync Data" to fetch or select a different branch.</div> : (
                                <div className="relative">
                                    {commits.map((commit) => <CommitTimelineItem key={commit.sha} commit={commit} />)}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Branches Tab */}
                {activeTab === 'branches' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/50 text-xs font-medium uppercase text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Branch Name</th>
                                        <th className="px-6 py-4">Last Commit</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {branches.map((branch) => (
                                        <tr key={branch.id} className="group hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
                                                        <GitBranch className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-medium text-slate-900">{branch.name}</span>
                                                    {branch.isDefault && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Default</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-md truncate text-slate-600">{branch.lastCommitMessage || '—'}</td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{branch.lastCommitAt || '—'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleGoToBranch(branch.name)}
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                >
                                                    View History
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* Pull Requests Tab (YENİ EKLENDİ) */}
                {activeTab === 'pull-requests' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {isLoadingPrs ? (
                                <div className="text-center py-12 text-slate-500">Loading pull requests...</div>
                            ) : prs.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center">
                                    <GitPullRequest className="h-12 w-12 text-slate-300 mb-3" />
                                    <p className="text-slate-500">No pull requests found.</p>
                                    <button onClick={handleSync} className="mt-4 text-sm font-medium text-blue-600 hover:underline">
                                        Sync with GitHub
                                    </button>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/50 text-xs font-medium uppercase text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Pull Request</th>
                                            <th className="px-6 py-4">Branch Flow</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {prs.map((pr) => {
                                            // PR durumunu belirle (merged API'den geliyorsa kullan, yoksa state'e bak)
                                            const isMerged = pr.isMerged;
                                            const isClosed = pr.state === 'closed';
                                            const isOpen = pr.state === 'open';

                                            return (
                                                <tr key={pr.id} className="group hover:bg-slate-50/50">
                                                    <td className="px-6 py-4 align-top">
                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold
                                                            ${isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                isMerged ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}
                                                        >
                                                            <GitPullRequest className="h-3.5 w-3.5" />
                                                            {isOpen ? 'Open' : isMerged ? 'Merged' : 'Closed'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-semibold text-slate-900 line-clamp-1" title={pr.title}>
                                                                {pr.title}
                                                            </span>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                <span className="font-mono">#{pr.number}</span>
                                                                <span>•</span>
                                                                <span>opened by <span className="font-medium text-slate-700">{pr.author}</span></span>
                                                                <span>•</span>
                                                                <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-xs font-mono">
                                                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">
                                                                {pr.sourceBranch}
                                                            </span>
                                                            <ArrowRight className="h-3 w-3 text-slate-400" />
                                                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 border border-slate-200">
                                                                {pr.targetBranch}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {/* DÜZELTME: <a> etiketi kaldırıldı, sadece button bırakıldı */}
                                                        <button
                                                            onClick={() => navigate(`/repositories/${repo.id}/pull-requests/${pr.number}`, { state: { pr, repo } })}
                                                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                        >
                                                            Details
                                                            <ArrowRight className="h-3 w-3" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}

/* ---------------------------------------------
   OVERVIEW CONTENT WIDGETS
   --------------------------------------------- */

const OverviewTabContent = ({ repo, commits, languageColor, repoLanguage }: { repo: Repo, commits: any[], languageColor: string, repoLanguage: string }) => {

    // Top Contributors
    const topContributors = useMemo(() => {
        const counts: Record<string, number> = {};
        commits.forEach(c => {
            const name = c.authorName !== 'Unknown' ? c.authorName : (c.authorLogin !== 'unknown' ? c.authorLogin : 'Anonymous');
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
    }, [commits]);

    // Latest Commit
    const latestCommit = commits.length > 0 ? commits[0] : null;
    const cloneUrl = repo.htmlUrl ? `${repo.htmlUrl}.git` : 'https://github.com/.../repo.git';

    // Activity Analysis (Gerçek Veri)
    const activityInfo = useMemo(() => {
        if (!latestCommit) return { status: 'Unknown', color: 'text-slate-500', bg: 'bg-slate-100' };
        const now = new Date();
        const lastDate = latestCommit.rawDate;
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 7) return { status: 'Active Development', color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (diffDays < 30) return { status: 'Maintained', color: 'text-blue-600', bg: 'bg-blue-50' };
        if (diffDays < 180) return { status: 'Slow Activity', color: 'text-orange-600', bg: 'bg-orange-50' };
        return { status: 'Dormant / Archived', color: 'text-slate-600', bg: 'bg-slate-100' };
    }, [latestCommit]);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* SOL KOLON */}
            <div className="lg:col-span-2 space-y-6">

                {/* 1. Repository Intelligence Card (YENİLENDİ: Boşsa "Cockpit" göster) */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    {repo.description ? (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <FileText className="h-5 w-5 text-slate-400" />
                                <h3 className="text-lg font-semibold text-slate-900">About Repository</h3>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-600 mb-6">{repo.description}</p>
                        </>
                    ) : (
                        // BOŞSA GÖSTERİLECEK AKILLI ALAN (COCKPIT)
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-slate-400" />
                                    <h3 className="text-lg font-semibold text-slate-900">Repository Intelligence</h3>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${activityInfo.bg} ${activityInfo.color} border border-transparent`}>
                                    {activityInfo.status}
                                </span>
                            </div>

                            {/* Fake Terminal for Clone */}
                            <div className="rounded-xl bg-[#1e293b] border border-slate-800 overflow-hidden shadow-md">
                                <div className="flex items-center gap-1.5 px-4 py-2 bg-[#0f172a] border-b border-slate-800">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                    <div className="ml-auto text-[10px] text-slate-500 font-mono">bash</div>
                                </div>
                                <div className="px-4 py-3 flex items-center justify-between group">
                                    <code className="font-mono text-sm text-green-400 truncate mr-4">
                                        <span className="text-slate-500 select-none">$ </span>
                                        git clone {cloneUrl}
                                    </code>
                                    <CopyButton text={`git clone ${cloneUrl}`} className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>

                            {/* Latest Activity Snippet */}
                            {latestCommit && (
                                <div className="mt-4 flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="mt-1">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-blue-600">
                                            <Zap className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Latest Pulse</div>
                                        <p className="text-sm font-medium text-slate-900 line-clamp-1">{latestCommit.message}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            committed by <span className="font-medium text-slate-700">{latestCommit.authorName}</span> • {latestCommit.date}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Meta Data Footer */}
                    <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <div className="space-y-1">
                            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">License</div>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                {(repo as any).license?.name || 'No License'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Created</div>
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                <Clock className="h-4 w-4 text-blue-500" />
                                {new Date(repo.createdAt ?? '').toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Language Dominance */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Code2 className="h-5 w-5 text-slate-400" />
                        <h3 className="text-lg font-semibold text-slate-900">Dominant Language</h3>
                    </div>

                    <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100 ring-4 ring-white shadow-sm">
                        <div style={{ width: '100%', backgroundColor: languageColor }} title={repoLanguage} />
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: languageColor }} />
                            <span className="text-sm font-medium text-slate-900">{repoLanguage}</span>
                            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Primary</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SAĞ KOLON */}
            <div className="space-y-6">

                {/* 1. Contributors */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-slate-400" />
                            <h3 className="text-base font-semibold text-slate-900">Top Contributors</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {topContributors.length > 0 ? topContributors.map((contributor, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <Avatar name={contributor.name} className="h-8 w-8 text-xs" />
                                    <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                                        {contributor.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${Math.min((contributor.count / (topContributors[0].count)) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-slate-500">{contributor.count}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-sm text-slate-400 py-2">No commit data available.</div>
                        )}
                    </div>
                </div>

                {/* 2. Health */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-5 w-5 text-slate-400" />
                        <h3 className="text-base font-semibold text-slate-900">Repository Health</h3>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium text-slate-700">Open Issues</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{repo.openIssues ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2">
                                <GitFork className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium text-slate-700">Forks</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{repo.forks ?? 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};