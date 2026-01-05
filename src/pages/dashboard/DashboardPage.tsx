import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import {
  GitBranch, Users, Activity, Flame, RefreshCw, GitCommit, ArrowUpRight,
  Calendar as CalendarIcon, GitPullRequest, AlertTriangle, CheckCircle,
  AlertOctagon, Code2, Heart, ShieldCheck, Zap, TrendingUp, Trophy,
  HelpCircle, Clock, FolderGit, Star, Eye, Share2, Scale, Building2
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Cell, PieChart, Pie, Radar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';

import { useAuth } from '@/shared/contexts/AuthContext';
import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import { queryCommits, initCommits } from '@/shared/lib/commit-api';
import { getBranchesByRepo, initBranchesByRepo } from '@/shared/lib/branch-api';
import { queryPullRequests, initPullRequests } from '@/shared/lib/pr-api';
import { getRepoLanguages, initLanguages } from '@/shared/lib/language-api';
import { getRepoMetrics } from '@/shared/lib/repo-metrics-api';
import type { RepoMetricsDto } from '@/shared/lib/dto/repo-metrics-dto';
import type { Repo } from '@/entities/repo';
import type { Commit } from '@/entities/commit';
import type { PullRequest } from '@/entities/pull-request';
import type { RepoLanguage } from '@/entities/language';
import { Dropdown } from '@/shared/ui/dropdown';
import { TabPill } from '@/shared/ui/tab';
import { Avatar } from '@/shared/ui/avatar';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';
import { ErrorState } from '@/shared/ui/error-state';
import { useToast } from '@/shared/contexts/ToastContext';
import type { AppError } from '@/shared/errors';

/* ---------- EKSİK TİP TANIMLAMALARI (HATALARI ÇÖZEN KISIM) ---------- */
type ChartDataPoint = { date: string; displayDate: string; commits: number };
type RecentCommit = { repo: string; author: string; msg: string; time: string; rawDate: number };
type WeekRange = '7d' | '30d' | '90d';
type ContributorStats = { name: string; commits: number; percentage: number };

/* ---------- STYLES ---------- */
const heatmapStyles = `
  .react-calendar-heatmap text { font-size: 9px; fill: #9ca3af; }
  .react-calendar-heatmap .color-empty { fill: #ebedf0; } 
  .react-calendar-heatmap .color-scale-1 { fill: #9be9a8; }
  .react-calendar-heatmap .color-scale-2 { fill: #40c463; }
  .react-calendar-heatmap .color-scale-3 { fill: #30a14e; }
  .react-calendar-heatmap .color-scale-4 { fill: #216e39; }
  .react-calendar-heatmap rect { rx: 2px; stroke: #fff; stroke-width: 1px; }
  .heatmap-container { width: 100%; }
`;

/* ---------- CONSTANTS ---------- */
const LANG_COLOR: Record<string, string> = {
  JavaScript: '#F7DF1E', TypeScript: '#3178C6', Python: '#3776AB', 'C++': '#00599C',
  Java: '#007396', Markdown: '#000000', Vue: '#4FC08D', React: '#61DAFB',
  Go: '#00ADD8', Rust: '#DEA584', HTML: '#E34C26', CSS: '#563D7C', Shell: '#89e051',
  Default: '#94A3B8',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const REVIEW_COLORS: any = { APPROVED: '#10b981', CHANGES_REQUESTED: '#f59e0b', COMMENTED: '#3b82f6' };

/* ---------- UTILS ---------- */
function timeAgo(dateParam: string | number | Date) {
  if (!dateParam) return null;
  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
  const seconds = Math.round((new Date().getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function calculateStreak(commits: Commit[]): number {
  if (!commits.length) return 0;
  const dates = Array.from(new Set(commits.map(c =>
    c.committedAt ? new Date(c.committedAt).toISOString().split('T')[0] : ''
  ).filter(d => d))).sort().reverse();
  if (!dates.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  let currentDate = new Date(dates[0]);
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i]);
    const diffDays = Math.ceil(Math.abs(currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) { streak++; currentDate = prevDate; } else break;
  }
  return streak;
}

function getMostActiveDay(commits: Commit[]): string {
  if (!commits.length) return 'N/A';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  commits.forEach(c => { if (c.committedAt) counts[new Date(c.committedAt).getDay()]++; });
  const max = Math.max(...counts);
  return days[counts.indexOf(max)];
}

function getCommitsByHour(commits: Commit[]) {
  const data = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  commits.forEach(c => { if (c.committedAt) data[new Date(c.committedAt).getHours()].count++; });
  return data;
}

function formatDataForRadar(dayMap: Record<string, number> | undefined) {
  if (!dayMap) return [];
  const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  return order.map(day => ({ subject: day.substring(0, 3), A: dayMap[day] || 0, fullMark: 100 }));
}

function formatDataForPie(stateMap: Record<string, number> | undefined) {
  if (!stateMap) return [];
  return Object.entries(stateMap).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
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

/* ---------- COMPONENTS ---------- */

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1.5 align-middle">
      <HelpCircle size={14} className="text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl border border-slate-700">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white text-slate-700 text-xs p-3 rounded-lg shadow-xl ring-1 ring-slate-100 border border-slate-100 z-50">
        <p className="font-bold mb-2 text-slate-900 border-b border-slate-100 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
            <span className="font-bold font-mono text-slate-800">{entry.value}</span>
            <span className="opacity-70">{entry.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded ${className}`} />;
}

// KPI Card
function NewKpiCard({ title, value, icon, color, subText, delay, tooltip, trend }: any) {
  const iconColorClass = color.replace('bg-', 'text-').replace('50', '600');
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center mb-1 gap-1">
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">{title}</p>
            {tooltip && <InfoTooltip text={tooltip} />}
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {typeof value === 'number' ? <CountUp end={value} duration={2} separator="," /> : value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl ${color} ${iconColorClass}`}>
          {icon}
        </div>
      </div>
      {(subText || trend) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
          {trend !== undefined && (
            <span className={`text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
          {subText && <p className="text-slate-400 text-[10px] font-medium truncate">{subText}</p>}
        </div>
      )}
    </motion.div>
  );
}

// Health Score Widget
function HealthScoreWidget({ metrics }: { metrics: RepoMetricsDto }) {
  const score = metrics.healthScore?.overallHealthScore ?? 0;
  const status = metrics.healthScore?.healthStatus || 'N/A';
  const breakdown = metrics.healthScore?.breakdown || {};

  const getColor = (s: number) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-orange-600' : 'text-red-600';

  const items = [
    { label: 'Activity', val: metrics.healthScore?.activityScore, w: breakdown.activityWeight },
    { label: 'Quality', val: metrics.healthScore?.codeQualityScore, w: breakdown.qualityWeight },
    { label: 'Community', val: metrics.healthScore?.communityScore, w: breakdown.communityWeight },
    { label: 'Popularity', val: metrics.healthScore?.popularityScore, w: breakdown.popularityWeight },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Heart className="text-rose-500" size={20} />
          <span className="font-bold text-slate-800">Repository Health</span>
          <InfoTooltip text="Overall health score calculated by weighted metrics." />
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${score >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{status}</span>
      </div>
      <div className="flex items-end gap-2 mb-6">
        <span className={`text-5xl font-black tracking-tighter ${getColor(score)}`}>
          <CountUp end={score} duration={2.5} />
        </span>
        <span className="text-sm font-medium text-slate-400 mb-1.5">/100</span>
      </div>
      <div className="space-y-4 flex-1">
        {items.map((i: any) => (
          <div key={i.label}>
            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
              <span>{i.label}</span>
              <span>{i.val?.toFixed(0) || 0}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${i.val || 0}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${i.val >= 80 ? 'bg-emerald-500' : i.val >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Work Habits (Radar Chart)
function WorkHabitsWidget({ data }: { data: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
        <Clock size={16} className="text-violet-500" /> Daily Rhythm
        <InfoTooltip text="Most productive days of the week." />
      </h3>
      <div className="flex-1 min-h-[200px] -ml-6">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Radar name="Commits" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Work Balance (Bar)
function WorkBalanceWidget({ weekday, weekend }: { weekday: number, weekend: number }) {
  const total = weekday + weekend;
  const weekdayPct = total ? (weekday / total) * 100 : 0;
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col justify-center">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Scale size={16} className="text-teal-500" /> Work Balance
        <InfoTooltip text="Weekday vs Weekend commit ratio." />
      </h3>
      <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
        <span>Weekday ({weekday})</span>
        <span>Weekend ({weekend})</span>
      </div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
        <motion.div initial={{ width: 0 }} animate={{ width: `${weekdayPct}%` }} className="h-full bg-slate-800" />
        <div className="h-full bg-slate-300 flex-1" />
      </div>
      <p className="text-[10px] text-slate-400 mt-3 text-center">
        {weekdayPct > 80 ? "Balanced Schedule 🌴" : "Weekend Warrior ⚔️"}
      </p>
    </div>
  );
}

function ReviewStatsWidget({ reviews }: { reviews: any }) {
  const data = formatDataForPie(reviews?.reviewsByState);
  const total = reviews?.totalReviews || 0;

  // Renkleri güvenli çekmek için
  const getColor = (name: string) => {
    const key = name.replace(' ', '_');
    return (REVIEW_COLORS as any)[key] || '#cbd5e1'; // Varsayılan gri
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Eye size={16} className="text-indigo-500" /> Review Status
      </h3>

      <div className="flex items-center justify-between flex-1">
        {/* SOL: Grafik */}
        <div className="relative w-[120px] h-[120px] mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={40}
                outerRadius={55}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                ))}
              </Pie>
              {/* Tooltip'i CustomTooltip ile değiştirdik ki o kaba beyaz kutu çıkmasın */}
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Ortadaki Yüzde Yazısı */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-black text-slate-800">
              {reviews?.approvalRate?.toFixed(0)}%
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase">Approval</span>
          </div>
        </div>

        {/* SAĞ: Özel Lejant (Liste) */}
        <div className="flex-1 pl-6 flex flex-col justify-center gap-2">
          {data.map((item: any) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(item.name) }} />
                <span className="text-slate-600 font-medium capitalize">{item.name.toLowerCase()}</span>
              </div>
              <span className="font-bold text-slate-800">{item.value}</span>
            </div>
          ))}

          <div className="h-px bg-slate-50 w-full my-1"></div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total PRs</span>
            <span className="font-medium">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
// PR Sizes
function PrStatsWidget({ prs }: { prs: any }) {
  const sizeData = [
    { name: 'Small', value: prs?.smallPrCount || 0, color: '#10b981' },
    { name: 'Medium', value: prs?.mediumPrCount || 0, color: '#3b82f6' },
    { name: 'Large', value: prs?.largePrCount || 0, color: '#f59e0b' },
  ];
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <GitPullRequest size={16} className="text-blue-500" /> PR Sizes
        <InfoTooltip text="Smaller PRs are safer. Large PRs are risky." />
      </h3>
      <div className="flex items-end gap-2 h-32 mb-6 justify-around">
        {sizeData.map((d) => (
          <div key={d.name} className="flex flex-col items-center gap-1 w-1/4 group">
            <span className="text-xs font-bold text-slate-700">{d.value}</span>
            <div className="w-full bg-slate-100 rounded-t-lg relative h-24 overflow-hidden">
              <motion.div initial={{ height: 0 }} animate={{ height: `${(d.value / (Math.max(...sizeData.map(s => s.value)) || 1)) * 100}%` }} className="absolute bottom-0 w-full rounded-t-lg transition-all" style={{ backgroundColor: d.color }} />
            </div>
            <span className="text-[10px] font-medium text-slate-400">{d.name}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
        <div><p className="text-[10px] text-slate-400 uppercase font-bold">Merge Rate</p><p className="text-lg font-bold text-slate-800">{prs?.mergeRate?.toFixed(1)}%</p></div>
        <div><p className="text-[10px] text-slate-400 uppercase font-bold">Avg Merge Time</p><p className="text-lg font-bold text-slate-800">{prs?.averageMergeTimeHours?.toFixed(1)}h</p></div>
      </div>
    </div>
  );
}

// Branch List Widget
function BranchList({ branches }: { branches: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Share2 size={16} className="text-cyan-500" /> Active Branches
      </h3>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {branches.map((b) => (
          <div key={b.branchName} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <GitBranch size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]" title={b.branchName}>{b.branchName}</span>
              {b.isDefault && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Default</span>}
            </div>
            <span className="text-xs font-bold text-slate-600">{b.commitCount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContributorRow({ contributor, rank }: { contributor: ContributorStats; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-lg px-2 transition-colors group">
      <div className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-md ${rank === 0 ? 'bg-amber-100 text-amber-700' : rank === 1 ? 'bg-slate-200 text-slate-600' : rank === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
        {rank + 1}
      </div>
      <Avatar name={contributor.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-slate-700 truncate">{contributor.name}</span>
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">{contributor.commits} commits</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${contributor.percentage}%` }} transition={{ duration: 1, delay: 0.2 }} className="bg-blue-500 h-1.5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function LanguageWidget({ languages, loading }: { languages: RepoLanguage[], loading: boolean }) {
  if (loading) return <Skeleton className="w-full h-full rounded-xl" />;
  const safeLanguages = languages || [];

  if (safeLanguages.length === 0) {
    return (
      <div className="flex flex-col h-full justify-center items-center text-slate-400">
        <Code2 size={24} className="mb-2 opacity-50" />
        <span className="text-xs">No language data</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Code2 size={16} className="text-pink-500" />
        Top Languages
      </h3>
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
        {safeLanguages.map((lang, idx) => {
          const color = LANG_COLOR[lang.name] || CHART_COLORS[idx % CHART_COLORS.length];
          return (
            <div key={lang.name}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium text-slate-700">{lang.name}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-900">{lang.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${lang.percentage}%` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductivityChart({ data }: { data: { hour: number; count: number }[] }) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Clock size={16} className="text-orange-500" />
        Productivity Hours
        <InfoTooltip text="Shows which hours of the day you commit code the most." />
      </h3>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#fb923c' : '#fed7aa'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PrRiskWidget({ prs }: { prs: PullRequest[] }) {
  const stats = useMemo(() => {
    let safe = 0, risky = 0, critical = 0;
    prs.forEach(pr => {
      const changes = (pr.additions || 0) + (pr.deletions || 0);
      if (changes > 1000) critical++; else if (changes > 500) risky++; else safe++;
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
          <GitPullRequest size={24} className="mb-2 opacity-50" /> <span>No PR data</span>
        </div>
      ) : (
        <div className="flex flex-col justify-center gap-6 flex-1 px-2">
          {['Critical', 'Risky', 'Safe'].map((label, i) => {
            const val = label === 'Critical' ? stats.critical : label === 'Risky' ? stats.risky : stats.safe;
            const color = label === 'Critical' ? 'bg-red-500' : label === 'Risky' ? 'bg-orange-500' : 'bg-emerald-500';
            const bg = label === 'Critical' ? 'bg-red-50' : label === 'Risky' ? 'bg-orange-50' : 'bg-emerald-50';
            const icon = label === 'Critical' ? <AlertOctagon size={14} className="text-red-500" /> : label === 'Risky' ? <AlertTriangle size={14} className="text-orange-500" /> : <CheckCircle size={14} className="text-emerald-500" />;
            return (
              <div key={label}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">{icon} <span className="text-sm font-medium text-slate-700">{label}</span></div>
                  <span className="font-bold text-slate-900">{val}</span>
                </div>
                <div className={`w-full ${bg} rounded-full h-2 overflow-hidden`}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${getPercent(val)}%` }} transition={{ duration: 0.8 }} className={`${color} h-full rounded-full`} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- PAGE COMPONENT ---------- */
export default function DashboardPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [repos, setRepos] = useState<Repo[]>([]);

  // Org & Repo Selection
  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [languages, setLanguages] = useState<RepoLanguage[]>([]);
  const [repoMetrics, setRepoMetrics] = useState<RepoMetricsDto | null>(null);
  const [recent, setRecent] = useState<RecentCommit[]>([]);

  // Loading States
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [weekRange, setWeekRange] = useState<WeekRange>('30d');
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
        if (!data.length) { await initUserRepos(); data = await getUserRepos(); }
        setRepos(data);
        if (!selectedRepoId && data[0]) setSelectedRepoId(data[0].id);
      } catch (error) { setRepoError(error as AppError); showError('Failed to load repositories.'); } finally { setLoadingRepos(false); }
    };
    loadRepos();
  }, [user, showError]);

  // ORG FILTER LOGIC
  const uniqueOrgs = useMemo(() => {
    const orgs = new Set(repos.map(r => (r as any).ownerLogin || 'Unknown'));
    return ['All', ...Array.from(orgs)];
  }, [repos]);

  const filteredRepos = useMemo(() => {
    if (selectedOrg === 'All') return repos;
    return repos.filter(r => (r as any).ownerLogin === selectedOrg);
  }, [repos, selectedOrg]);

  // Handle Org Change
  const handleOrgChange = (org: string) => {
    setSelectedOrg(org);
    const firstRepoInOrg = repos.find(r => org === 'All' ? true : (r as any).ownerLogin === org);
    if (firstRepoInOrg) setSelectedRepoId(firstRepoInOrg.id);
  };

  // METRICS & DATA FETCHING
  const fetchMetrics = async (repoName: string) => {
    setLoadingMetrics(true);
    setRepoMetrics(null);
    try {
      const token = (user as any).accessToken || (user as any).token || localStorage.getItem('token');
      const data = await getRepoMetrics(repoName, token);
      setRepoMetrics(data);
    } catch (err) { console.warn("Repo metrics error", err); } finally { setLoadingMetrics(false); }
  };

  const fetchData = async (forceSync = false) => {
    if (!repos.length) return;
    const targetRepo = repos.find(r => r.id === selectedRepoId);
    if (!targetRepo) return;

    const token = (user as any).accessToken || (user as any).token || localStorage.getItem('token');
    fetchMetrics(targetRepo.fullName);

    setLoadingCommits(true);
    setCommitError(null);
    try {
      // Fetch commits for heatmap/recent logic
      const branches = await getBranchesByRepo(targetRepo.fullName).catch(() => []);
      const uniqueCommitsMap = new Map<string, Commit>();
      const recentsRaw: RecentCommit[] = [];

      const branchPromises = branches.map(async (br) => {
        if (forceSync) await initCommits(targetRepo.fullName, br.name);
        let cList = await queryCommits(targetRepo.fullName, br.name);
        if (!cList.length && !forceSync) { await initCommits(targetRepo.fullName, br.name); cList = await queryCommits(targetRepo.fullName, br.name); }
        return cList;
      });
      const results = await Promise.all(branchPromises);
      results.flat().forEach(c => {
        if (c.sha && !uniqueCommitsMap.has(c.sha)) {
          uniqueCommitsMap.set(c.sha, c);
          recentsRaw.push({ repo: targetRepo.fullName, author: c.authorLogin || c.authorName || 'unknown', msg: c.message || 'No message', time: c.committedAt ? new Date(c.committedAt).toLocaleString() : '', rawDate: c.committedAt ? new Date(c.committedAt).getTime() : 0 });
        }
      });
      setCommits(Array.from(uniqueCommitsMap.values()));
      recentsRaw.sort((a, b) => b.rawDate - a.rawDate);
      setRecent(recentsRaw.slice(0, 20));
      if (forceSync) showSuccess('Data synchronized');
    } catch (error) { setCommitError(error as AppError); showError('Failed to load commit data.'); } finally { setLoadingCommits(false); }

    setLoadingPrs(true);
    try {
      if (forceSync) await initPullRequests(targetRepo.fullName);
      let data = await queryPullRequests(targetRepo.fullName);
      if (!data.length && !forceSync) { await initPullRequests(targetRepo.fullName); data = await queryPullRequests(targetRepo.fullName); }
      setPrs(data);
    } catch { } finally { setLoadingPrs(false); }

    setLoadingLanguages(true);
    try {
      if (forceSync) await initLanguages(targetRepo.fullName, token);
      await initLanguages(targetRepo.fullName, token);
      const langData = await getRepoLanguages(targetRepo.fullName, token);
      if (langData && langData.items) {
        const totalBytes = langData.items.reduce((a, b) => a + b.bytes, 0);
        setLanguages(langData.items.map(l => ({ ...l, percentage: (l.bytes / totalBytes) * 100 })));
      }
    } catch { } finally { setLoadingLanguages(false); }
  };

  useEffect(() => { fetchData(false); }, [selectedRepoId]);
  const handleRefresh = () => fetchData(true);
  const handleRetryCommits = () => { setCommitError(null); fetchData(false); };

  /* --- DATA PREPARATION --- */
  const radarData = useMemo(() => formatDataForRadar((repoMetrics as any)?.commits?.commitsByDayOfWeek), [repoMetrics]);
  const commitsByHour = useMemo(() => getCommitsByHour(commits), [commits]);
  const heatmapData = useMemo(() => getHeatmapData(commits), [commits]);

  const buildChartData = (commits: Commit[], range: WeekRange) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const data = [];
    const today = new Date();
    const map = new Map<string, number>();
    commits.forEach(c => { if (c.committedAt) { const d = new Date(c.committedAt).toISOString().split('T')[0]; map.set(d, (map.get(d) || 0) + 1); } });
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(today.getDate() - i);
      const k = d.toISOString().split('T')[0];
      data.push({ date: k, displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), commits: map.get(k) || 0 });
    }
    return data;
  };
  const chartData = useMemo(() => buildChartData(commits, weekRange), [commits, weekRange]);

  const activityData = useMemo(() => {
    return (repoMetrics as any)?.activityTrend?.weeklyTrend?.map((w: any) => ({
      name: w.week.split('-W')[1],
      commits: w.commits,
      prs: w.pullRequests,
      displayDate: w.week
    })) || [];
  }, [repoMetrics]);

  const activeReposCount = useMemo(() => {
    if (!repos.length) return 0;
    return repos.filter(r => {
      const dateVal = r.updatedAt ? new Date(r.updatedAt).getTime() : new Date().getTime();
      const diffTime = Math.abs(new Date().getTime() - dateVal);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 30;
    }).length;
  }, [repos]);

  const currentStreak = useMemo(() => calculateStreak(commits), [commits]);
  const mostActiveDay = useMemo(() => getMostActiveDay(commits), [commits]);
  const total = commits.length;

  const topContributors = useMemo(() => {
    if ((repoMetrics as any)?.contributors?.topContributorsByCommits) {
      return (repoMetrics as any).contributors.topContributorsByCommits;
    }
    return [];
  }, [repoMetrics]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] p-6 lg:p-8 font-sans text-slate-900">
      <style>{heatmapStyles}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="text-blue-600" /> Analytics Dashboard
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {repos.find(r => r.id === selectedRepoId)?.name ? `Deep dive into ${repos.find(r => r.id === selectedRepoId)?.name}` : 'Select a repository'}
          </p>
          {repoMetrics && (
            <div className="flex gap-3 mt-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100"><Star size={12} /> {(repoMetrics.overview as any)?.stars} Stars</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200"><FolderGit size={12} /> {(repoMetrics.overview as any)?.size} KB</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100"><Code2 size={12} /> {(repoMetrics.overview as any)?.primaryLanguage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* ORG DROPDOWN */}
          <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm min-w-[140px]">
            <Dropdown label="Org" items={uniqueOrgs.map(o => ({ label: o, value: o }))} value={selectedOrg} onChange={handleOrgChange} />
          </div>
          {/* REPO DROPDOWN */}
          <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm min-w-[200px]">
            <Dropdown label="Repository" items={filteredRepos.map(r => ({ label: r.name, value: r.id }))} value={selectedRepoId || ''} onChange={setSelectedRepoId} />
          </div>
          <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm">
            {loadingRepos || loadingMetrics ? <LoadingSpinner size="sm" /> : <RefreshCw size={18} className="text-slate-500" />}
          </button>
        </div>
      </div>

      {repoMetrics ? (
        <>
          {/* ROW 1: HEALTH, ACTIVITY TREND & KEY NUMBERS (ESKİ YERLEŞİM GERİ GELDİ) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* 1. HEALTH SCORE (3 Sütun) */}
            <div className="lg:col-span-3">
              <HealthScoreWidget metrics={repoMetrics} />
            </div>

            {/* 2. ACTIVITY TREND (6 Sütun - ESKİ YERİNE TAŞINDI) */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={16} className="text-blue-500" /> Activity Trend</h3>
                <div className="scale-90 origin-right"><TabPill label="7d" active={weekRange === '7d'} onClick={() => setWeekRange('7d')} /><TabPill label="30d" active={weekRange === '30d'} onClick={() => setWeekRange('30d')} /></div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {/* DÜZELTME: Filtreleme Mantığı Korundu */}
                  <AreaChart data={weekRange !== '30d' || activityData.length === 0 ? chartData : activityData}>
                    <defs><linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={weekRange !== '30d' || activityData.length === 0 ? "displayDate" : "name"} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="commits" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCommits)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. KPI CARDS (3 Sütun - Yan yana dikey dizilim) */}
            <div className="lg:col-span-3 grid grid-cols-1 gap-4">
              <NewKpiCard title="Total Commits" value={(repoMetrics as any).commits?.totalCommits || total} icon={<GitCommit size={20} />} color="bg-blue-50"  />
              <NewKpiCard title="Open Issues" value={(repoMetrics as any).overview?.openIssues} icon={<AlertOctagon size={20} />} color="bg-rose-50" tooltip="Total number of open issues." />
              <NewKpiCard title="Active Contributors" value={(repoMetrics as any).contributors?.activeContributorsLast30Days} icon={<Users size={20} />} color="bg-purple-50" subText="Last 30 Days" />
            </div>
          </div>

          {/* ROW 2: HABITS & PRODUCTIVITY */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-1"><WorkHabitsWidget data={radarData} /></div>
            <div className="lg:col-span-1">
              <WorkBalanceWidget
                weekday={(repoMetrics as any).commits?.weekdayCommits || 0}
                weekend={(repoMetrics as any).commits?.weekendCommits || 0}
              />
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock size={16} className="text-orange-500" /> Productivity Hours</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commitsByHour}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>{commitsByHour.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.count > 10 ? '#ea580c' : '#fb923c'} />))}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 3: QUALITY & PROCESS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-2"><PrStatsWidget prs={(repoMetrics as any).pullRequests} /></div>
            <div className="lg:col-span-1"><ReviewStatsWidget reviews={(repoMetrics as any).reviews} /></div>
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-teal-500" /> Quality Gates</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><span className="text-xs font-bold text-slate-600">Net Code Change</span><span className={`text-sm font-bold ${(repoMetrics as any).codeQuality?.netCodeChange > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{(repoMetrics as any).codeQuality?.netCodeChange > 0 ? '+' : ''}{(repoMetrics as any).codeQuality?.netCodeChange}</span></div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><span className="text-xs font-bold text-slate-600">Avg Commit Msg</span><span className="text-sm font-bold text-slate-800">{(repoMetrics as any).codeQuality?.averageCommitMessageLength} chars</span></div>
                {/* DÜZELTME: Regular Commits Boş Veri Hatası Korundu */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><span className="text-xs font-bold text-slate-600">Regular Commits</span><span className="text-sm font-bold text-blue-600">{((repoMetrics as any).codeQuality?.regularCommitPercentage ?? 0).toFixed(1)}%</span></div>
              </div>
            </div>
          </div>

          {/* ROW 4: LISTS & HEATMAP */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Trophy size={16} className="text-yellow-500" /> Top Contributors</h3>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {topContributors.map((c: any, i: number) => (
                  <div key={c.contributorLogin} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
                    <Avatar name={c.contributorLogin} size="sm" />
                    <div className="flex-1"><p className="text-xs font-bold text-slate-700">{c.contributorLogin}</p><p className="text-[10px] text-slate-400">{c.totalContributions} total contributions</p></div>
                    <div className="text-right"><span className="block text-xs font-bold text-blue-600">{c.commitCount} cmts</span></div>
                  </div>
                ))}
              </div>
            </div>

            <BranchList branches={(repoMetrics as any).branches?.topBranchesByCommits || []} />

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Code2 size={16} className="text-pink-500" /> Top Languages</h3>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                {languages.map((lang: any, idx: number) => {
                  const color = LANG_COLOR[lang.name] || CHART_COLORS[idx % CHART_COLORS.length];
                  return (
                    <div key={lang.name}><div className="flex justify-between items-center mb-1"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /><span className="text-xs font-medium text-slate-700">{lang.name}</span></div><span className="text-[10px] font-bold text-slate-900">{lang.percentage.toFixed(1)}%</span></div><div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${lang.percentage}%` }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ backgroundColor: color }} /></div></div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ROW 5: HEATMAP */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4"><CalendarIcon size={18} className="text-slate-400" /><h3 className="text-sm font-bold text-slate-800">Contribution Calendar</h3></div>
            <div className="w-full">
              <CalendarHeatmap startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))} endDate={new Date()} values={heatmapData} classForValue={(value: any) => (!value || value.count === 0) ? 'color-empty' : `color-scale-${Math.min(value.count, 4)}`} showWeekdayLabels gutterSize={3} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[500px]">{loadingMetrics ? <LoadingSpinner size="lg" /> : <div className="text-slate-400">Select a repository to view analytics</div>}</div>
      )}
    </div>
  );
}