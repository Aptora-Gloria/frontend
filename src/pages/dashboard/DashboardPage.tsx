// src/pages/dashboard/DashboardPage.tsx
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
  Calendar as CalendarIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { useAuth } from '@/shared/contexts/AuthContext';
import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import { queryCommits, initCommits } from '@/shared/lib/commit-api';
import { getBranchesByRepo, initBranchesByRepo } from '@/shared/lib/branch-api';
import type { Repo } from '@/entities/repo';
import type { Commit } from '@/entities/commit';
import { Dropdown } from '@/shared/ui/dropdown';
import { TabPill } from '@/shared/ui/tab';
import { Avatar } from '@/shared/ui/avatar';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';

/* ---------- TİP TANIMLAMALARI ---------- */
type ChartDataPoint = { date: string; displayDate: string; commits: number };
type RecentCommit = { repo: string; author: string; msg: string; time: string; rawDate: number };
type WeekRange = '7d' | '30d' | '90d'; // Aralığı biraz daha netleştirdim
type ContributorStats = { name: string; commits: number; percentage: number };

/* ---------- CUSTOM STYLES ---------- */
const heatmapStyles = `
  .react-calendar-heatmap text { font-size: 10px; fill: #94a3b8; }
  .react-calendar-heatmap .color-empty { fill: #f1f5f9; }
  .react-calendar-heatmap .color-scale-1 { fill: #dbeafe; }
  .react-calendar-heatmap .color-scale-2 { fill: #bfdbfe; }
  .react-calendar-heatmap .color-scale-3 { fill: #60a5fa; }
  .react-calendar-heatmap .color-scale-4 { fill: #2563eb; }
  .react-calendar-heatmap rect:hover { stroke: #555; stroke-width: 1px; }
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

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

/* ---------- UI COMPONENTS ---------- */

function KpiCard({ title, value, icon, color, trend, delay, fullValue }: { title: string; value: number | string; icon: ReactNode; color: string; trend?: number; delay: number, fullValue?: string }) {
  const baseColor = color.split('-')[1];
  const isNumber = typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
  const numValue = isNumber ? Number(value) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</span>
          <div className="flex items-baseline gap-2" title={fullValue}>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight cursor-default">
              {isNumber ? <CountUp end={numValue} duration={2} separator="," /> : value}
            </h3>
            {trend !== undefined && (
              <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-60 text-${baseColor}-600 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
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
      <div className="bg-white text-slate-700 text-xs p-3 rounded-lg shadow-xl ring-1 ring-slate-100 border border-slate-100">
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
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg px-2 transition-colors group">
      <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-full shadow-sm ${rank === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-50' :
          rank === 1 ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-100' :
            rank === 2 ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-50' :
              'bg-slate-50 text-slate-400'
        }`}>
        {rank + 1}
      </div>
      <Avatar name={contributor.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-semibold text-slate-700 truncate">{contributor.name}</span>
          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{contributor.commits} commits</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${contributor.percentage}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className="bg-blue-500 h-1.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          />
        </div>
      </div>
    </div>
  );
}

function TopRepoList({ repos }: { repos: { name: string; stars: number }[] }) {
  return (
    <div className="flex flex-col gap-2 h-full">
      {repos.map((repo, i) => (
        <div key={repo.name} className="flex items-center justify-between group p-2.5 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 cursor-default">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-xs font-bold w-4 text-center ${i < 3 ? 'text-blue-600' : 'text-slate-400'}`}>#{i + 1}</span>
            <span className="text-sm font-semibold text-slate-700 truncate" title={repo.name}>
              {repo.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-700">
            <Award size={12} className="text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold">{repo.stars}</span>
          </div>
        </div>
      ))}
      {repos.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm opacity-60">
          No data available
        </div>
      )}
    </div>
  );
}

function CommitTimeline({ commits }: { commits: RecentCommit[] }) {
  return (
    <div className="relative pl-5 border-l border-slate-200 space-y-6 h-full py-1 ml-2">
      {commits.map((c, i) => (
        <div key={i} className="relative group">
          <div className="absolute -left-[25px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-300 group-hover:border-blue-500 group-hover:scale-125 transition-all z-10 shadow-sm"></div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer" title={c.msg}>
                {c.msg}
              </span>
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                {timeAgo(c.rawDate)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-0.5">
              <span className="font-medium text-slate-600 flex items-center gap-1.5 bg-slate-100 pr-2 pl-1 py-0.5 rounded-full">
                <Avatar name={c.author} size="sm" className="w-4 h-4 text-[8px]" />
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

/* ---------- LOGIC ---------- */
const DEFAULT_RECENT_COMMITS: RecentCommit[] = [{ repo: '-', author: '-', msg: 'No data', time: '', rawDate: 0 }];
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

// --- DÜZELTİLEN FONKSİYON: GERÇEK TARİH OLUŞTURUCU ---
function buildChartData(commits: Commit[], range: WeekRange): ChartDataPoint[] {
  // 1. Gün sayısını belirle (Varsayılan 30)
  const daysToLookBack = range === '7d' ? 7 : range === '30d' ? 30 : 90;

  // 2. Son X gün için boş bir dizi oluştur
  const data: ChartDataPoint[] = [];
  const today = new Date();

  for (let i = daysToLookBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);

    // YYYY-MM-DD formatı (Eşleştirme için)
    const dateKey = d.toISOString().split('T')[0];

    // Görünen Format (Dec 12)
    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Bu güne ait commitleri say
    const count = commits.filter(c => {
      if (!c.committedAt) return false;
      return c.committedAt.startsWith(dateKey);
    }).length;

    data.push({
      date: dateKey,
      displayDate, // Grafikte bu görünecek
      commits: count
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
    .map(([name, commits]) => ({ name, commits, percentage: Math.round((commits / total) * 100) }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);
}

function getCommitsByDay(commits: Commit[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const map = new Map<string, number>();
  commits.forEach((c) => {
    if (!c.committedAt) return;
    const day = days[new Date(c.committedAt).getDay()];
    map.set(day, (map.get(day) ?? 0) + 1);
  });
  return days.map(day => ({ day, commits: map.get(day) ?? 0 }));
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

  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [recent, setRecent] = useState<RecentCommit[]>(DEFAULT_RECENT_COMMITS);

  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [weekRange, setWeekRange] = useState<WeekRange>('30d');

  // 1. Repoları Getir
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        setLoadingRepos(true);
        let data = await getUserRepos();
        if (!data.length) { await initUserRepos(); data = await getUserRepos(); }
        setRepos(data);
        if (!selectedRepoId && data[0]) setSelectedRepoId(data[0].id);
      } finally { setLoadingRepos(false); }
    };
    run();
  }, [user]);

  // Org Gruplama
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

  // 2. Commitleri Getir
  useEffect(() => {
    const run = async () => {
      if (!repos.length) return;
      let target: Repo[] = [];
      if (isOrgAggregated) target = repos.filter((r) => getOrgLabel(r) === selectedOrg);
      else if (selectedRepo) target = [selectedRepo];
      else return;

      try {
        setLoadingCommits(true);
        const all: Commit[] = [];
        const recentsRaw: RecentCommit[] = [];

        for (const r of target) {
          const fullName = r.fullName;
          let branches = await getBranchesByRepo(fullName).catch(() => []);
          if (!branches.length) branches = await initBranchesByRepo(fullName).catch(() => []);
          const branchNames = branches.map((b) => b.name);
          const repoAllCommits: Commit[] = [];
          for (const br of branchNames) {
            let cList = await queryCommits(fullName, br).catch(() => []);
            if (!cList.length) { await initCommits(fullName, br); cList = await queryCommits(fullName, br).catch(() => []); }
            repoAllCommits.push(...cList);
          }
          all.push(...repoAllCommits);
          recentsRaw.push(...repoAllCommits.map((c) => mapCommit(c, fullName)));
        }

        setCommits(all);
        recentsRaw.sort((a, b) => b.rawDate - a.rawDate);
        setRecent(recentsRaw.slice(0, 20));

      } finally { setLoadingCommits(false); }
    };
    run();
  }, [repos, selectedOrg, selectedRepoId]);

  // Derived Stats
  const total = commits.length;
  const contrib = new Set(commits.map((c) => c.authorLogin || c.authorName).filter(Boolean)).size;
  const avg = contrib ? (total / contrib).toFixed(1) : '0';
  const mostActive = isOrgAggregated ? `${selectedOrg}` : selectedRepo?.fullName ?? '-';

  // --- CHART DATA (Düzeltildi) ---
  const chartData = useMemo(() => buildChartData(commits, weekRange), [commits, weekRange]);

  const topStars = useMemo(() => [...repos].sort((a, b) => (b.stargazers ?? 0) - (a.stargazers ?? 0)).slice(0, 5).map((r) => ({ name: r.fullName || r.name, stars: r.stargazers ?? 0 })), [repos]);
  const topContributors = useMemo(() => getTopContributors(commits), [commits]);
  const commitsByDay = useMemo(() => getCommitsByDay(commits), [commits]);
  const heatmapData = useMemo(() => getHeatmapData(commits), [commits]);

  // Trend Hesabı
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
    <div className="min-h-screen bg-[#F8F9FC] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-6 lg:p-8 font-sans text-slate-900">
      <style>{heatmapStyles}</style>

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
            <GitBranch className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Git Analytics</h1>
            <p className="text-xs font-medium text-slate-500">Real-time repository insights</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
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

          <button onClick={() => window.location.reload()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm">
            {(loadingRepos || loadingCommits) ? <LoadingSpinner size="sm" /> : <RefreshCw size={18} className="text-slate-600" />}
          </button>
        </div>
      </motion.div>

      {/* 1. KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {loadingRepos ? (
          <>
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </>
        ) : (
          <>
            <KpiCard title="Total Commits" value={total} icon={<Activity size={24} />} color="bg-blue-50" trend={trend} delay={0.1} />
            <KpiCard title="Contributors" value={contrib} icon={<Users size={24} />} color="bg-purple-50" delay={0.2} />
            <KpiCard title="Avg / Dev" value={avg} icon={<GitBranch size={24} />} color="bg-green-50" delay={0.3} />
            <KpiCard
              title="Active Repo"
              value={mostActive.length > 15 ? mostActive.substring(0, 15) + '...' : mostActive}
              fullValue={mostActive}
              icon={<Flame size={24} />}
              color="bg-orange-50"
              delay={0.4}
            />
          </>
        )}
      </div>

      {/* 2. MAIN CHARTS (ORTA - TARİHLER DÜZELTİLDİ) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="xl:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">Commits Trend</h3>
            <div className="scale-90 origin-right">
              <TabPill label="7d" active={weekRange === '7d'} onClick={() => setWeekRange('7d')} />
              <TabPill label="30d" active={weekRange === '30d'} onClick={() => setWeekRange('30d')} />
              <TabPill label="90d" active={weekRange === '90d'} onClick={() => setWeekRange('90d')} />
            </div>
          </div>
          <div className="h-64 w-full">
            {loadingCommits ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  {/* Düzeltme: displayDate (Dec 12) kullanılıyor */}
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="commits" name="Commits" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCommits)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
        >
          <h3 className="text-sm font-bold text-slate-700 mb-6">Weekly Rhythm</h3>
          <div className="h-64 w-full">
            {loadingCommits ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commitsByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                  <Bar dataKey="commits" name="Commits" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* 3. HEATMAP SECTION */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon size={18} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700">Contribution Calendar</h3>
        </div>
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[800px]">
            {loadingCommits ? <Skeleton className="h-[140px] w-full" /> :
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
              />}
          </div>
        </div>
      </motion.div>

      {/* 4. BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-[28rem]"
        >
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Award size={16} className="text-amber-500" />
            Top Repositories
          </h3>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {loadingRepos ? <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> :
              <TopRepoList repos={topStars} />}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-[28rem]"
        >
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
                  No contributors yet
                </div>
              )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-[28rem]"
        >
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
        </motion.div>
      </div>
    </div>
  );
}