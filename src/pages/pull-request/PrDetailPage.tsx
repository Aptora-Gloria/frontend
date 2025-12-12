import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, GitPullRequest, GitCommitHorizontal, MessageSquare,
    CheckCircle2, ExternalLink, Copy, Check,
    GitMerge, MessageCircle, AlertCircle, Loader2,
    FileText, GitBranch, Calendar, User, ArrowRight,
    Plus, Minus, FileDiff, Clock, MoreHorizontal
} from 'lucide-react';

import { Avatar } from '@/shared/ui';
import type { PullRequest, PrMetric } from '@/entities/pull-request';
import type { Repo } from '@/entities/repo';
import { getPrMetrics, getPrBasicInfo } from '@/shared/lib/pr-api';
import { getUserRepos } from '@/shared/lib/repo-api';

/* --- UI HELPER COMPONENTS --- */

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
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100"
            title="Copy"
        >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
        </button>
    );
};

const TabButton = ({ active, label, count, onClick, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors border-b-2 ${active
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
    >
        {Icon && <Icon size={16} className={active ? 'text-slate-900' : 'text-slate-400'} />}
        {label}
        {count !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-slate-100 text-slate-900' : 'bg-slate-100 text-slate-500'
                }`}>
                {count}
            </span>
        )}
    </button>
);

const StatusBadge = ({ state, merged }: { state: string, merged?: boolean }) => {
    const isMerged = merged === true;
    const isClosed = state === 'closed' && !isMerged;
    const isOpen = state === 'open';

    // Daha soft renkler
    let config = { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: AlertCircle, label: state };

    if (isOpen) {
        config = { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: GitPullRequest, label: 'Open' };
    } else if (isMerged) {
        config = { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: GitMerge, label: 'Merged' };
    } else if (isClosed) {
        config = { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: CheckCircle2, label: 'Closed' };
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold capitalize ${config.bg} ${config.text} ${config.border}`}>
            <config.icon size={14} />
            <span>{config.label}</span>
        </div>
    );
};

// Daha minimalist ve temiz Stat Kartları
const StatCard = ({ label, value, icon: Icon, colorClass }: any) => (
    <div className="flex flex-col justify-between p-5 bg-white border border-slate-200 rounded-xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] hover:border-slate-300 transition-all group">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className={`p-1.5 rounded-md ${colorClass.replace('text-', 'bg-').replace('600', '50')} ${colorClass}`}>
                <Icon size={16} />
            </div>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{value}</span>
            <span className="text-xs text-slate-400 font-medium">total</span>
        </div>
    </div>
);

/* --- MAIN PAGE COMPONENT --- */

export default function PrDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { repoId, prNumber } = useParams();

    const statePr = (location.state as any)?.pr as PullRequest | undefined;
    const stateRepo = (location.state as any)?.repo as Repo | undefined;

    const [prBasic, setPrBasic] = useState<PullRequest | null>(statePr || null);
    const [prMetrics, setPrMetrics] = useState<PrMetric | null>(null);
    const [repoFullName, setRepoFullName] = useState<string | null>(stateRepo?.fullName || null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'commits' | 'reviews'>('overview');

    useEffect(() => {
        if (!repoId || !prNumber) return;

        const loadData = async () => {
            try {
                setLoading(true);
                let currentFullName = repoFullName;

                if (!currentFullName) {
                    const repos = await getUserRepos();
                    const foundRepo = repos.find(r => String(r.id) === String(repoId));
                    if (foundRepo) {
                        currentFullName = foundRepo.fullName;
                        setRepoFullName(foundRepo.fullName);
                    } else {
                        setLoading(false);
                        return;
                    }
                }

                if (!prBasic) {
                    const basicData = await getPrBasicInfo(currentFullName!, Number(prNumber));
                    if (basicData) setPrBasic(basicData);
                }

                const metricsData = await getPrMetrics(currentFullName!, Number(prNumber));
                if (metricsData) setPrMetrics(metricsData);

            } catch (error) {
                console.error("Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [repoId, prNumber]);

    const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const formatDateTime = (d?: string | null) => d ? new Date(d).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

    // Timeline Builder (Sorted by date)
    const timelineItems = useMemo(() => {
        if (!prMetrics) return [];
        const comments = (prMetrics.comments || []).map(c => ({ ...c, type: 'comment', dateObj: new Date(c.created_at) }));
        const reviews = (prMetrics.reviews || []).map(r => ({ ...r, type: 'review', dateObj: new Date(r.submitted_at) }));
        return [...comments, ...reviews].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    }, [prMetrics]);

    if (loading && !prBasic) return <div className="flex h-screen items-center justify-center bg-[#F9FAFB]"><Loader2 className="animate-spin text-slate-400 w-6 h-6" /></div>;
    if (!prBasic) return <div className="flex h-screen items-center justify-center bg-[#F9FAFB] text-slate-500 font-medium">Pull Request Not Found</div>;

    const commitCount = prMetrics?.commitCount ?? 0;
    const reviewCount = prMetrics?.reviewCount ?? 0;
    const commentCount = prMetrics?.commentCount ?? 0;
    const additions = prBasic.additions ?? 0;
    const deletions = prBasic.deletions ?? 0;
    const changedFiles = prBasic.changedFiles ?? 0;

    const commitsList = prMetrics?.commits || [];
    const reviewsList = prMetrics?.reviews || [];

    return (
        <div className="min-h-screen bg-[#F9FAFB] pb-20 font-sans text-slate-900">

            {/* --- HEADER --- */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="mx-auto max-w-7xl px-6 pt-6">
                    <button onClick={() => navigate(-1)} className="group mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
                        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Repository
                    </button>

                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                        <div className="flex-1">
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-2xl font-semibold text-slate-900 leading-tight">
                                            {prBasic.title} <span className="text-slate-400 font-light">#{prBasic.number}</span>
                                        </h1>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                        <StatusBadge state={prBasic.state} merged={prBasic.isMerged} />
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-900">{prBasic.author}</span>
                                            <span className="text-slate-400">opened this pull request on {formatDate(prBasic.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <a href={prBasic.htmlUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                <ExternalLink size={14} /> Open on GitHub
                            </a>
                        </div>
                    </div>

                    {/* Modern Branch Flow Bar */}
                    <div className="mb-2 p-1 bg-slate-100/50 rounded-lg border border-slate-200 inline-flex flex-wrap items-center gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2 bg-blue-50/50 px-2 py-1 rounded border border-blue-100 text-blue-700">
                            <GitBranch size={12} className="opacity-70" />
                            <span>{prBasic.sourceBranch}</span>
                            <CopyButton text={prBasic.sourceBranch} />
                        </div>
                        <ArrowRight className="text-slate-300" size={14} />
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-600">
                            <GitBranch size={12} className="opacity-70" />
                            <span>{prBasic.targetBranch}</span>
                        </div>

                        {(additions > 0 || deletions > 0) && (
                            <>
                                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                <span className="flex items-center gap-1 text-emerald-600 font-sans font-medium px-1">
                                    <Plus size={12} strokeWidth={3} /> {additions}
                                </span>
                                <span className="flex items-center gap-1 text-red-600 font-sans font-medium px-1">
                                    <Minus size={12} strokeWidth={3} /> {deletions}
                                </span>
                                <span className="flex items-center gap-1 text-slate-500 font-sans px-1">
                                    <FileDiff size={12} /> {changedFiles} files
                                </span>
                            </>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-6 mt-4">
                        <TabButton active={activeTab === 'overview'} label="Overview" onClick={() => setActiveTab('overview')} />
                        <TabButton active={activeTab === 'commits'} label="Commits" count={commitCount} onClick={() => setActiveTab('commits')} />
                        <TabButton active={activeTab === 'reviews'} label="Reviews" count={reviewCount} onClick={() => setActiveTab('reviews')} />
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <main className="mx-auto max-w-7xl px-6 py-8">

                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* LEFT COLUMN */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Description Box */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-slate-400" />
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Description</h3>
                                    </div>
                                </div>
                                <div className="p-5 prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {/* Eğer body varsa onu göster, yoksa italik mesaj göster */}
                                    {prBasic.body ? prBasic.body : <span className="italic text-slate-400">No description provided.</span>}
                                </div>
                            </div>

                            {/* Timeline Activity */}
                            <div className="relative">
                                {/* Vertical Line */}
                                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 -z-10" />

                                <div className="space-y-8">
                                    {timelineItems.length === 0 ? (
                                        <div className="ml-12 p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                                            <p className="text-slate-500 text-sm">No conversation activity yet.</p>
                                        </div>
                                    ) : (
                                        timelineItems.map((item: any, idx) => {
                                            const isReview = item.type === 'review';
                                            const isApproved = isReview && item.state === 'APPROVED';
                                            const isChanges = isReview && item.state === 'CHANGES_REQUESTED';

                                            return (
                                                <div key={`${item.type}-${item.id || idx}`} className="flex gap-4 relative">
                                                    <div className="flex-shrink-0 relative">
                                                        <Avatar name={item.user?.login} size="md" className="shadow-sm ring-4 ring-[#F9FAFB]" />
                                                        {isReview && (
                                                            <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ring-2 ring-white ${isApproved ? 'bg-emerald-500' : isChanges ? 'bg-red-500' : 'bg-slate-400'}`}>
                                                                {isApproved ? <Check size={10} className="text-white" /> : isChanges ? <AlertCircle size={10} className="text-white" /> : <MoreHorizontal size={10} className="text-white" />}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${isReview ? 'border-slate-200' : 'border-slate-200'}`}>
                                                            <div className="bg-slate-50/50 px-4 py-2.5 border-b border-slate-100 flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-sm text-slate-900">{item.user?.login}</span>
                                                                    <span className="text-xs text-slate-500">
                                                                        {isReview ? `reviewed (${item.state.toLowerCase().replace('_', ' ')})` : 'commented'}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs text-slate-400" title={formatDateTime(item.dateObj)}>
                                                                    {formatDate(item.dateObj)}
                                                                </span>
                                                            </div>
                                                            {item.body ? (
                                                                <div className="p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                                    {item.body}
                                                                </div>
                                                            ) : (
                                                                <div className="p-4 text-sm text-slate-400 italic">No description provided.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SIDEBAR */}
                        <div className="space-y-6">
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-1 gap-3">
                                <StatCard label="Commits" value={commitCount} icon={GitCommitHorizontal} colorClass="text-blue-600" />
                                <StatCard label="Reviews" value={reviewCount} icon={CheckCircle2} colorClass="text-purple-600" />
                                <StatCard label="Comments" value={commentCount} icon={MessageSquare} colorClass="text-orange-500" />
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Meta Information</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-slate-500">Repository</span>
                                        <span className="font-medium text-slate-900">{repoFullName || repoId}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-slate-500">Created</span>
                                        <span className="font-medium text-slate-900">{formatDate(prBasic.createdAt)}</span>
                                    </div>
                                    {prBasic.closedAt && (
                                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                            <span className="text-slate-500">Closed</span>
                                            <span className="font-medium text-slate-900">{formatDate(prBasic.closedAt)}</span>
                                        </div>
                                    )}
                                    <div className="pt-2">
                                        <div className="text-xs text-slate-400 mb-2">Assignees</div>
                                        <div className="flex items-center gap-2">
                                            <Avatar name={prBasic.author} size="sm" />
                                            <span className="text-sm font-medium text-slate-700">{prBasic.author}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 2. COMMITS TAB */}
                {activeTab === 'commits' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {commitsList.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {commitsList.map((c: any) => (
                                        <div key={c.sha} className="p-4 hover:bg-slate-50/50 transition-colors flex items-start gap-4 group">
                                            <div className="mt-1">
                                                <GitCommitHorizontal className="text-slate-300" size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-900 text-sm leading-snug mb-1">{c.commit?.message}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Avatar name={c.commit?.author?.name} size="sm" className="w-4 h-4" />
                                                    <span className="font-medium text-slate-700">{c.commit?.author?.name}</span>
                                                    <span>committed on {formatDateTime(c.commit?.author?.date)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                    <span className="font-mono text-xs text-slate-500">{c.sha.substring(0, 7)}</span>
                                                    <CopyButton text={c.sha} />
                                                </div>
                                                <a href={c.html_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-16 text-center">
                                    <GitCommitHorizontal className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                    <p className="text-slate-500">No commits found.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* 3. REVIEWS TAB */}
                {activeTab === 'reviews' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {reviewsList.length > 0 ? (
                            reviewsList.map((review: any) => {
                                const isApproved = review.state === 'APPROVED';
                                const isChanges = review.state === 'CHANGES_REQUESTED';

                                let statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
                                if (isApproved) statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                if (isChanges) statusColor = 'bg-red-50 text-red-700 border-red-200';

                                return (
                                    <div key={review.id} className={`bg-white rounded-xl border p-6 shadow-sm ${isApproved ? 'border-emerald-100/50' : 'border-slate-200'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={review.user?.login} size="md" />
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900">{review.user?.login}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                        <Clock size={12} />
                                                        <span>{formatDateTime(review.submitted_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${statusColor}`}>
                                                {review.state?.replace(/_/g, ' ').toLowerCase()}
                                            </span>
                                        </div>
                                        {review.body ? (
                                            <div className="ml-12 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 leading-relaxed">
                                                {review.body}
                                            </div>
                                        ) : (
                                            <p className="ml-12 text-sm text-slate-400 italic">No description provided.</p>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
                                <CheckCircle2 className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                <p className="text-slate-500">No reviews yet.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    );
}