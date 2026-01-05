import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import {
  GitBranch,
  Users,
  Activity,
  Flame,
  RefreshCw,
  GitCommit,
  Award,
  ArrowUpRight,
  Calendar as CalendarIcon,
  GitPullRequest, // EKLENDİ
  AlertTriangle,  // EKLENDİ
  CheckCircle,    // EKLENDİ
  AlertOctagon    // EKLENDİ
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { useAuth } from '@/shared/contexts/AuthContext';
import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import { queryCommits, initCommits } from '@/shared/lib/commit-api';
import { getBranchesByRepo, initBranchesByRepo } from '@/shared/lib/branch-api';
// YENİ IMPORTLAR (PR API)
import { queryPullRequests, initPullRequests } from '@/shared/lib/pr-api'; 
import type { Repo } from '@/entities/repo';
import type { Commit } from '@/entities/commit';
import type { PullRequest } from '@/entities/pull-request'; // EKLENDİ

import { Dropdown } from '@/shared/ui/dropdown';
import { TabPill } from '@/shared/ui/tab';
import { Avatar } from '@/shared/ui/avatar';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';
import { ErrorState } from '@/shared/ui/error-state';
import { useToast } from '@/shared/contexts/ToastContext';
import type { AppError } from '@/shared/errors';

/* ---------- TYPES ---------- */
type ChartDataPoint = { date: string; displayDate: string; commits: number };
type RecentCommit = { repo: string; author: string; msg: string; time: string; rawDate: number };
type WeekRange = '7d' | '30d' | '90d';
type ContributorStats = { name: string; commits: number; percentage: number };

/* ---------- STYLES ---------- */
const heatmapStyles = `
  .react-calendar-heatmap text { font-size: 10px; fill: #94a3b8; }
  .react-calendar-heatmap .color-empty { fill: #f1f5f9; }
  .react-calendar-heatmap .color-scale-1 { fill: #dbeafe; }
  .react-calendar-heatmap .color-scale-2 { fill: #93c5fd; }
  .react-calendar-heatmap .color-scale-3 { fill: #3b82f6; }
  .react-calendar-heatmap .color-scale-4 { fill: #1d4ed8; }
  .react-calendar-heatmap rect:hover { stroke: #cbd5e1; stroke-width: 1px; }
`;

/* ---------- UTILS ---------- */
function timeAgo(dateParam: string | number | Date) {
  if (!dateParam) return null;
  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
  const today = new Date();
  const seconds = Math.round((today.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

/* ---------- COMPONENTS ---------- */

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded ${className}`} />;
}

function KpiCard({ title, value, icon, color, trend, delay, fullValue }: { title: string; value: number | string; icon: ReactNode; color: string; trend?: number; delay: number, fullValue?: string }) {
  const isNumber = typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
  const numValue = isNumber ? Number(value) : 0;
  const iconColorClass = color.replace('bg-', 'text-').replace('50', '600');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</span>
          <div className="flex items-baseline gap-2" title={fullValue}>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight cursor-default">
              {isNumber ? <CountUp end={numValue} duration={2} separator="," /> : value}
            </h3>
            {trend !== undefined && (
              <span className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${color} ${iconColorClass}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

const CustomTooltip = (props: any) => {
  const { active, payload, label } = props;
  if (active && payload && payload.length) {
    return (
      <div className="bg-white text-slate-700 text-xs p-3 rounded-lg shadow-xl ring-1 ring-slate-100 border border-slate-100 z-50">
        <p className="font-bold mb-2 text-slate-900 border-b border-slate-100 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="font-bold font-mono text-slate-800">{entry.value}</span>
            <span className="opacity-70">{entry.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function ContributorRow({ contributor, rank }: { contributor: ContributorStats; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-lg px-2 transition-colors group">
      <div className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-md ${rank === 0 ? 'bg-amber-100 text-amber-700' :
        rank === 1 ? 'bg-slate-200 text-slate-600' :
          rank === 2 ? 'bg-orange-100 text-orange-700' :
            'bg-slate-100 text-slate-400'
        }`}>
        {rank + 1}
      </div>
      <Avatar name={contributor.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-slate-700 truncate">{contributor.name}</span>
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">{contributor.commits} commits</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${contributor.percentage}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className="bg-blue-500 h-1.5 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

function CommitTimeline({ commits }: { commits: RecentCommit[] }) {
  return (
    <div className="relative pl-4 space-y-6 h-full py-2 ml-2 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
      {commits.map((c, i) => (
        <div key={i} className="relative group pl-6">
          <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-300 group-hover:border-blue-500 transition-colors z-10"></div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer" title={c.msg}>
                {c.msg}
              </span>
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                {timeAgo(c.rawDate)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-0.5">
              <span className="font-medium text-slate-600 flex items-center gap-1.5 bg-slate-50 pr-2 pl-1 py-0.5 rounded-full border border-slate-100">
                <Avatar name={c.author} size="sm" className="w-3.5 h-3.5 text-[8px]" />
                {c.author}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 truncate max-w-[120px] font-mono text-[10px]">{c.repo}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- YENİ WIDGET: PR RISK ANALYSIS ---
function PrRiskWidget({ prs }: { prs: PullRequest[] }) {
    // Risk Hesaplama Mantığı
    const stats = useMemo(() => {
        let safe = 0;   // 0-500
        let risky = 0;  // 500-1000
        let critical = 0; // 1000+
        
        prs.forEach(pr => {
            // Not: Entity içinde additions/deletions yoksa varsayılan 0 alıyoruz.
            // Eğer entity'nizde bu alanlar yoksa pr-api dönüşünde bunları eklemeniz gerekebilir.
            const changes = (pr.additions || 0) + (pr.deletions || 0);
            
            if (changes > 1000) critical++;
            else if (changes > 500) risky++;
            else safe++;
        });

        const total = safe + risky + critical;
        return { safe, risky, critical, total };
    }, [prs]);

    const getPercent = (val: number) => stats.total > 0 ? (val / stats.total) * 100 : 0;

    return (
        <div className="flex flex-col h-full">
             <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                <GitPullRequest size={16} className="text-indigo-500" />
                PR Risk Analysis
            </h3>

            {stats.total === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <GitPullRequest size={24} className="mb-2 opacity-50" />
                    <span>No PR data analyzed</span>
                </div>
            ) : (
                <div className="flex flex-col justify-center gap-6 flex-1 px-2">
                    {/* CRITICAL */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                                <AlertOctagon size={14} className="text-red-500" />
                                <span className="text-sm font-medium text-slate-700">Critical Risk</span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">1000+ changes</span>
                            </div>
                            <span className="font-bold text-slate-900">{stats.critical}</span>
                        </div>
                        <div className="w-full bg-red-50 rounded-full h-2 overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }} animate={{ width: `${getPercent(stats.critical)}%` }} transition={{ duration: 0.8 }}
                                className="bg-red-500 h-full rounded-full" 
                             />
                        </div>
                    </div>

                    {/* RISKY */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-orange-500" />
                                <span className="text-sm font-medium text-slate-700">Risky</span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">500-1000</span>
                            </div>
                            <span className="font-bold text-slate-900">{stats.risky}</span>
                        </div>
                        <div className="w-full bg-orange-50 rounded-full h-2 overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }} animate={{ width: `${getPercent(stats.risky)}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                                className="bg-orange-500 h-full rounded-full" 
                             />
                        </div>
                    </div>

                    {/* SAFE */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-500" />
                                <span className="text-sm font-medium text-slate-700">Safe</span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">0-500</span>
                            </div>
                            <span className="font-bold text-slate-900">{stats.safe}</span>
                        </div>
                        <div className="w-full bg-emerald-50 rounded-full h-2 overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }} animate={{ width: `${getPercent(stats.safe)}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                                className="bg-emerald-500 h-full rounded-full" 
                             />
                        </div>
                    </div>
                    
                    <div className="mt-2 pt-4 border-t border-slate-50 flex justify-between text-xs text-slate-500">
                        <span>Total PRs Analyzed</span>
                        <span className="font-mono font-medium">{stats.total}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- LOGIC ---------- */
const DEFAULT_RECENT_COMMITS: RecentCommit[] = [];
const ORG_ALL = '__all_repos';

function mapCommit(c: Commit, repo: string): RecentCommit {
  return {
    repo,
    author: c.authorLogin || c.authorName || 'unknown',
    msg: c.message || 'No message',
    time: c.committedAt ? new Date(c.committedAt).toLocaleString() : '',
    rawDate: c.committedAt ? new Date(c.committedAt).getTime() : 0
  };
}

function getOrg(repo: Repo): string {
  if ((repo as any).ownerLogin) return (repo as any).ownerLogin;
  if (repo.fullName?.includes('/')) return repo.fullName.split('/')[0];
  return 'no-org';
}

function getOrgLabel(repo: Repo): string {
  const org = getOrg(repo);
  return org === 'no-org' ? 'User repos' : org;
}

function buildChartData(commits: Commit[], range: WeekRange): ChartDataPoint[] {
  const daysToLookBack = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const data: ChartDataPoint[] = [];
  const today = new Date();

  const commitCountsByDate = new Map<string, number>();

  commits.forEach(c => {
    if (!c.committedAt) return;
    const dateKey = new Date(c.committedAt).toISOString().split('T')[0];
    commitCountsByDate.set(dateKey, (commitCountsByDate.get(dateKey) || 0) + 1);
  });

  for (let i = daysToLookBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    data.push({
      date: dateKey,
      displayDate,
      commits: commitCountsByDate.get(dateKey) || 0
    });
  }
  return data;
}

function getTopContributors(commits: Commit[]): ContributorStats[] {
  const map = new Map<string, number>();
  commits.forEach((c) => {
    const author = c.authorLogin || c.authorName || 'unknown';
    map.set(author, (map.get(author) ?? 0) + 1);
  });
  const total = commits.length;
  return [...map.entries()]
    .map(([name, commits]) => ({ name, commits, percentage: total > 0 ? Math.round((commits / total) * 100) : 0 }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);
}

function getHeatmapData(commits: Commit[]): any[] {
  const map = new Map<string, number>();
  commits.forEach(c => {
    if (!c.committedAt) return;
    const dateStr = new Date(c.committedAt).toISOString().split('T')[0];
    map.set(dateStr, (map.get(dateStr) || 0) + 1);
  });
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

/* ---------- PAGE COMPONENT ---------- */
export default function DashboardPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  
  const [commits, setCommits] = useState<Commit[]>([]);
  // YENI STATE: Pull Requests
  const [prs, setPrs] = useState<PullRequest[]>([]); 
  
  const [recent, setRecent] = useState<RecentCommit[]>(DEFAULT_RECENT_COMMITS);

  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingCommits, setLoadingCommits] = useState(false);
  // PR loading ayrı olsun ki grafikler etkilenmesin
  const [loadingPrs, setLoadingPrs] = useState(false); 

  const [weekRange, setWeekRange] = useState<WeekRange>('30d');
  
  // Error states
  const [repoError, setRepoError] = useState<AppError | null>(null);
  const [commitError, setCommitError] = useState<AppError | null>(null);

  // 1. REPO LOAD
  useEffect(() => {
    const loadRepos = async () => {
      if (!user) return;
      
      try {
        setLoadingRepos(true);
        setRepoError(null);
        
        let data = await getUserRepos();
        if (!data.length) { 
          await initUserRepos(); 
          data = await getUserRepos(); 
        }
        
        setRepos(data);
        if (!selectedRepoId && data[0]) {
          setSelectedRepoId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load repositories:', error);
        setRepoError(error as AppError);
        showError('Failed to load repositories. Please try again.');
      } finally { 
        setLoadingRepos(false); 
      }
    };
    
    loadRepos();
  }, [user, showError]);

  // ORG GROUPING
  const grouped = useMemo(() => {
    const map = new Map<string, Repo[]>();
    repos.forEach((r) => {
      const org = getOrgLabel(r);
      if (!map.has(org)) map.set(org, []);
      map.get(org)!.push(r);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [repos]);

  const orgOptions = grouped.map(([label]) => ({ label, value: label }));
  const selectedRepo = useMemo(() => repos.find((r) => r.id === selectedRepoId) ?? null, [repos, selectedRepoId]);
  const isOrgAggregated = selectedOrg !== 'all' && selectedRepoId === ORG_ALL;

  // --- DATA FETCHING (MERKEZİ FONKSİYON - Commits & PRs) ---
  const fetchData = async (forceSync = false) => {
    if (!repos.length) return;

    // Hedef repoları belirle
    let target: Repo[] = [];
    if (selectedOrg === 'all') {
      if (!selectedRepoId) target = repos;
      else target = selectedRepo ? [selectedRepo] : repos;
    } else {
      if (isOrgAggregated) target = repos.filter((r) => getOrgLabel(r) === selectedOrg);
      else if (selectedRepo) target = [selectedRepo];
    }

    if (target.length === 0) return;

    // ---- 1. COMMITS FETCHING ----
    setLoadingCommits(true);
    setCommitError(null);
    try {
      const uniqueCommitsMap = new Map<string, Commit>();
      const recentsRaw: RecentCommit[] = [];
      let hasErrors = false;

      await Promise.all(target.map(async (r) => {
        const fullName = r.fullName;
        try {
          let branches = await getBranchesByRepo(fullName).catch(() => []);
          if (!branches.length) {
            branches = await initBranchesByRepo(fullName).catch(() => []);
          }

          const branchPromises = branches.map(async (br) => {
            try {
              if (forceSync) await initCommits(fullName, br.name);
              let cList = await queryCommits(fullName, br.name);
              if (!cList.length && !forceSync) {
                await initCommits(fullName, br.name);
                cList = await queryCommits(fullName, br.name);
              }
              return cList;
            } catch { return []; }
          });

          const results = await Promise.all(branchPromises);
          results.flat().forEach(c => {
            if (c.sha && !uniqueCommitsMap.has(c.sha)) {
              uniqueCommitsMap.set(c.sha, c);
              recentsRaw.push(mapCommit(c, fullName));
            }
          });
        } catch { hasErrors = true; }
      }));

      setCommits(Array.from(uniqueCommitsMap.values()));
      recentsRaw.sort((a, b) => b.rawDate - a.rawDate);
      setRecent(recentsRaw.slice(0, 20));

      if (forceSync && !hasErrors) showSuccess('Data synchronized successfully');

    } catch (error) {
      console.error('Failed to fetch commit data:', error);
      setCommitError(error as AppError);
      showError('Failed to load commit data.');
    } finally { 
      setLoadingCommits(false); 
    }

    // ---- 2. PRs FETCHING (YENİ KISIM) ----
    setLoadingPrs(true);
    try {
        const allPrs: PullRequest[] = [];
        // Tüm hedef repolar için PR'ları çek
        await Promise.all(target.map(async (r) => {
            try {
                // Eğer forceSync ise önce init yap
                if (forceSync) {
                    await initPullRequests(r.fullName);
                }
                
                let data = await queryPullRequests(r.fullName);
                
                // Eğer DB boşsa ve sync değilse yine de çekmeye çalış
                if (data.length === 0 && !forceSync) {
                     await initPullRequests(r.fullName);
                     data = await queryPullRequests(r.fullName);
                }
                allPrs.push(...data);
            } catch (err) {
                console.warn(`Failed to fetch PRs for ${r.fullName}`, err);
            }
        }));
        setPrs(allPrs);
    } catch (err) {
        console.error("PR fetch error:", err);
    } finally {
        setLoadingPrs(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [repos, selectedOrg, selectedRepoId]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleRetryRepos = () => {
    setRepoError(null);
    if (user) {
      // Basitçe reload tetiklemek için logic (yukarıdaki loadRepos useEffect'i çalışır)
    }
  };

  const handleRetryCommits = () => {
    setCommitError(null);
    fetchData(false);
  };

  // Derived Stats
  const total = commits.length;
  const contrib = new Set(commits.map((c) => c.authorLogin || c.authorName).filter(Boolean)).size;
  const avg = contrib ? (total / contrib).toFixed(1) : '0';
  const mostActive = isOrgAggregated ? `${selectedOrg}` : selectedRepo?.fullName ?? 'All Repos';

  // Chart Data
  const chartData = useMemo(() => buildChartData(commits, weekRange), [commits, weekRange]);
  const topContributors = useMemo(() => getTopContributors(commits), [commits]);
  const heatmapData = useMemo(() => getHeatmapData(commits), [commits]);

  // Trend
  const currentPeriodCommits = useMemo(() => {
    const days = weekRange === '30d' ? 30 : weekRange === '90d' ? 90 : 7;
    const cutoff = Date.now() - days * 86400000;
    return commits.filter((c) => c.committedAt && new Date(c.committedAt).getTime() >= cutoff).length;
  }, [commits, weekRange]);

  const previousPeriodCommits = useMemo(() => {
    const days = weekRange === '30d' ? 30 : weekRange === '90d' ? 90 : 7;
    const cutoff = Date.now() - days * 86400000;
    const previousCutoff = cutoff - days * 86400000;
    return commits.filter((c) => {
      if (!c.committedAt) return false;
      const t = new Date(c.committedAt).getTime();
      return t >= previousCutoff && t < cutoff;
    }).length;
  }, [commits, weekRange]);

  const trend = previousPeriodCommits > 0 ? Math.round(((currentPeriodCommits - previousPeriodCommits) / previousPeriodCommits) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAFBFC] p-6 lg:p-8 font-sans text-slate-900">
      <style>{heatmapStyles}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
            <GitBranch className="text-blue-600" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
            <p className="text-xs font-medium text-slate-500">Global activity dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <Dropdown
              label="Org"
              items={[{ label: 'All', value: 'all' }, ...orgOptions]}
              value={selectedOrg}
              onChange={setSelectedOrg}
            />
            <div className="w-px h-5 bg-slate-100" />
            <Dropdown
              label="Repo"
              items={
                selectedOrg === 'all'
                  ? repos.map((r) => ({ label: r.name, value: r.id }))
                  : [
                    { label: `All in ${selectedOrg}`, value: ORG_ALL },
                    ...repos.filter((r) => getOrgLabel(r) === selectedOrg).map((r) => ({ label: r.name, value: r.id })),
                  ]
              }
              value={selectedRepoId ?? ''}
              onChange={setSelectedRepoId}
            />
          </div>

          <button
            onClick={handleRefresh}
            className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm group active:scale-95"
            title="Sync Data from GitHub"
          >
            {(loadingRepos || loadingCommits || loadingPrs) ? <LoadingSpinner size="sm" /> : <RefreshCw size={18} className="text-slate-500 group-hover:text-blue-600" />}
          </button>
        </div>
      </div>

      {/* 1. KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {repoError ? (
          <div className="col-span-2 lg:col-span-4">
            <ErrorState 
              error={repoError} 
              onRetry={handleRetryRepos}
              size="sm"
              className="bg-white rounded-xl border border-slate-200 shadow-sm"
            />
          </div>
        ) : loadingRepos ? (
          <>
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[100px] w-full" />
          </>
        ) : (
          <>
            <KpiCard title="Total Commits" value={total} icon={<Activity size={20} />} color="bg-blue-50" delay={0.1} />
            <KpiCard title="Contributors" value={contrib} icon={<Users size={20} />} color="bg-purple-50" delay={0.2} />
            <KpiCard title="Commits / Dev" value={avg} icon={<GitBranch size={20} />} color="bg-emerald-50" delay={0.3} />
            <KpiCard
              title="Active Scope"
              value={mostActive.length > 15 ? mostActive.substring(0, 15) + '...' : mostActive}
              fullValue={mostActive}
              icon={<Flame size={20} />}
              color="bg-orange-50"
              delay={0.4}
            />
          </>
        )}
      </div>

      {/* 2. CHARTS ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="xl:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">Commit Activity</h3>
            <div className="scale-90 origin-right">
              <TabPill label="7d" active={weekRange === '7d'} onClick={() => setWeekRange('7d')} />
              <TabPill label="30d" active={weekRange === '30d'} onClick={() => setWeekRange('30d')} />
              <TabPill label="90d" active={weekRange === '90d'} onClick={() => setWeekRange('90d')} />
            </div>
          </div>
          <div className="h-64 w-full">
            {commitError ? (
              <ErrorState 
                error={commitError} 
                onRetry={handleRetryCommits}
                size="sm"
              />
            ) : loadingCommits ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="commits" name="Commits" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCommits)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* --- WEEKLY RHYTHM ALANI (BOŞ) --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
             <span className="text-xs font-medium">New Widget Area</span>
          </div>
        </motion.div>
      </div>

      {/* 3. HEATMAP */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon size={18} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-800">Contribution Calendar</h3>
        </div>
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[800px]">
            {commitError ? (
              <ErrorState 
                error={commitError} 
                onRetry={handleRetryCommits}
                size="sm"
              />
            ) : loadingCommits ? (
              <Skeleton className="h-[140px] w-full" />
            ) : (
              <CalendarHeatmap
                startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
                endDate={new Date()}
                values={heatmapData}
                classForValue={(value: any) => {
                  if (!value) return 'color-empty';
                  return `color-scale-${Math.min(value.count, 4)}`;
                }}
                tooltipDataAttrs={(value: any) => ({
                  'data-tip': value.date ? `${value.date}: ${value.count} commits` : 'No commits',
                } as any)}
                showWeekdayLabels
              />
            )}
          </div>
        </div>
      </motion.div>

      {/* 4. LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* --- YENİ WIDGET: PR RISK ANALYSIS --- */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-[28rem]">
            {loadingPrs ? (
                <div className="space-y-4 mt-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (
                <PrRiskWidget prs={prs} />
            )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-[28rem]">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={16} className="text-purple-500" />
            Top Contributors
          </h3>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {loadingCommits ? <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> :
              topContributors.length > 0 ? (
                topContributors.map((c, i) => (
                  <ContributorRow key={c.name} contributor={c} rank={i} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                  No contributors found
                </div>
              )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-[28rem]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <GitCommit size={16} className="text-blue-500" />
              Latest Activity
            </h3>
            <span className="text-[10px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-semibold cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1">
              View all <ArrowUpRight size={10} />
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingCommits ? <div className="space-y-4 mt-4 ml-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> :
              recent.length > 0 ? (
                <CommitTimeline commits={recent} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                  No recent activity
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}