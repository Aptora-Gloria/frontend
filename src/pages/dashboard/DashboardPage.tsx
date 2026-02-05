import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';

import {
  Activity,
  AlertOctagon,
  Calendar as CalendarIcon,
  Clock,
  Code2,
  FolderGit,
  GitCommit,
  GitPullRequest,
  HelpCircle,
  Heart,
  RefreshCw,
  Scale,
  ShieldCheck,
  Star,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  Eye,
  BadgeCheck,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  CheckSquare,
  GitFork,
  BookOpen,
  AlertCircle
} from 'lucide-react';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

import { useAuth } from '@/shared/contexts/AuthContext';
import { useToast } from '@/shared/contexts/ToastContext';

import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import { getBranchesByRepo, initBranchesByRepo } from '@/shared/lib/branch-api';
import { initCommits, queryCommits } from '@/shared/lib/commit-api';
import { initPullRequests, queryPullRequests } from '@/shared/lib/pr-api';
import { initLanguages, getRepoLanguages } from '@/shared/lib/language-api';
import { getRepoMetrics } from '@/shared/lib/repo-metrics-api';

import type { Repo } from '@/entities/repo';
import type { Commit } from '@/entities/commit';
import type { PullRequest } from '@/entities/pull-request';
import type { RepoLanguage } from '@/entities/language';
import type { RepoMetricsDto } from '@/shared/lib/dto/repo-metrics-dto';

import { Dropdown } from '@/shared/ui/dropdown';
import { TabPill } from '@/shared/ui/tab';
import { Avatar } from '@/shared/ui/avatar';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';
import type { AppError } from '@/shared/errors';

/* ---------- TYPES ---------- */
type WeekRange = '7d' | '30d' | '90d';

/* ---------- STYLES ---------- */
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
`;

/* ---------- CONSTANTS ---------- */
const LANG_COLOR: Record<string, string> = {
  JavaScript: '#F7DF1E', TypeScript: '#3178C6', Python: '#3776AB', 'C++': '#00599C',
  Java: '#007396', Markdown: '#000000', Vue: '#4FC08D', React: '#61DAFB',
  Go: '#00ADD8', Rust: '#DEA584', HTML: '#E34C26', CSS: '#563D7C', Shell: '#89e051',
  Default: '#94A3B8',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const REVIEW_COLORS: Record<string, string> = {
  APPROVED: '#10b981',
  CHANGES_REQUESTED: '#f59e0b',
  COMMENTED: '#3b82f6',
};

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
  const dates = Array.from(new Set(commits.map((c) => (c.committedAt ? new Date(c.committedAt).toISOString().split('T')[0] : '')).filter(Boolean))).sort().reverse();
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

function getCommitsByHour(commits: Commit[]) {
  const data = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  commits.forEach((c) => { if (c.committedAt) data[new Date(c.committedAt).getHours()].count++; });
  return data;
}

function formatDataForRadar(dayMap: Record<string, number> | undefined) {
  if (!dayMap) return [];
  const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  return order.map((day) => ({ subject: day.substring(0, 3), A: dayMap[day] || 0, fullMark: 100 }));
}

function formatDataForPie(stateMap: Record<string, number> | undefined) {
  if (!stateMap) return [];
  return Object.entries(stateMap).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
}

function buildChartData(commits: Commit[], range: WeekRange) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const today = new Date();
  const map = new Map<string, number>();
  commits.forEach((c) => { if (c.committedAt) { const key = new Date(c.committedAt).toISOString().split('T')[0]; map.set(key, (map.get(key) || 0) + 1); } });
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(today.getDate() - i); const key = d.toISOString().split('T')[0];
    data.push({ date: key, displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), commits: map.get(key) || 0 });
  }
  return data;
}

/* ---------- UI HELPERS ---------- */
function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-2 align-middle">
      <HelpCircle size={14} className="text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-3 bg-slate-900 text-white text-[11px] leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl border border-slate-700">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, tooltip }: { icon: React.ReactNode; title: string; tooltip?: string }) {
  return (
    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
      {icon} {title} {tooltip && <InfoTooltip text={tooltip} />}
    </h3>
  );
}

function MetricRow({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' | 'info' }) {
  const valueClass = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-rose-700' : tone === 'info' ? 'text-indigo-700' : 'text-slate-800';
  return (
    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span className={`text-sm font-black ${valueClass}`}>{value}</span>
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
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
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

/* ---------- WIDGETS ---------- */
function KpiCard({ title, value, icon, iconBg, tooltip }: { title: string; value: number | string; icon: React.ReactNode; iconBg: string; tooltip?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 h-full flex items-center justify-between">
      <div>
        <div className="flex items-center gap-1">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">{title}</p>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        <h3 className="text-3xl font-black text-slate-900 mt-1">
          {typeof value === 'number' ? <CountUp end={value} duration={1.8} separator="," /> : value}
        </h3>
      </div>
      <div className={`p-3 rounded-xl ${iconBg}`}>{icon}</div>
    </div>
  );
}

function HealthScoreWidget({ metrics }: { metrics: RepoMetricsDto }) {
  const score = metrics.healthScore?.overallHealthScore ?? 0;
  const status = metrics.healthScore?.healthStatus || 'N/A';
  const getColor = (s: number) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-orange-600' : 'text-red-600';
  const items = [
    { label: 'Activity', val: metrics.healthScore?.activityScore ?? 0 },
    { label: 'Quality', val: metrics.healthScore?.codeQualityScore ?? 0 },
    { label: 'Community', val: metrics.healthScore?.communityScore ?? 0 },
    { label: 'Popularity', val: metrics.healthScore?.popularityScore ?? 0 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Heart className="text-rose-500" size={20} />
          <span className="font-bold text-slate-800">Repository Health</span>
          <InfoTooltip text="Overall health score computed from activity, quality, and community metrics." />
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${score >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{status}</span>
      </div>
      <div className="flex items-end gap-2 mb-6">
        <span className={`text-5xl font-black tracking-tighter ${getColor(score)}`}><CountUp end={score} duration={2.2} decimals={2} /></span>
        <span className="text-sm font-medium text-slate-400 mb-1.5">/100</span>
      </div>
      <div className="space-y-4 flex-1">
        {items.map((i) => (
          <div key={i.label}>
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
              <span>{i.label}</span><span>{i.val.toFixed(0)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${i.val}%` }} transition={{ duration: 0.9 }} className={`h-full rounded-full ${i.val >= 80 ? 'bg-emerald-500' : i.val >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CodeVelocityWidget({ quality }: { quality: any }) {
  if (!quality) return <Skeleton className="h-full" />;
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><TrendingUp size={100} /></div>
      <SectionTitle icon={<Zap size={16} className="text-yellow-500" />} title="Code Velocity" tooltip="Growth rate and net code change statistics." />
      <div className="mt-4 space-y-4 relative z-10">
        <div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{quality.codeGrowthRate > 0 ? '+' : ''}{quality.codeGrowthRate?.toFixed(1)}%</p>
          <div className="flex items-center gap-1 text-xs font-medium text-slate-500 mt-1">
            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">+{quality.netCodeChange}</span><span>net lines changed</span>
          </div>
        </div>
        <div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(quality.regularCommitPercentage, 100)}%` }} className="h-full bg-blue-500 rounded-full" />
          </div>
          <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-1"><span>Regular Work ({quality.regularCommitPercentage?.toFixed(0)}%)</span><span>Merges</span></div>
        </div>
      </div>
    </div>
  );
}

function ReviewInsightsWidget({ reviews, codeQuality }: { reviews: any, codeQuality: any }) {
  if (!reviews) return <Skeleton className="h-full" />;
  const items = [
    { label: "Avg Reviews / PR", value: reviews.averageReviewsPerPr?.toFixed(1) || "0.0", icon: <MessageSquare size={14} className="text-blue-500" />, status: reviews.averageReviewsPerPr < 1 ? "text-orange-600" : "text-slate-900" },
    { label: "Unreviewed PRs", value: `${codeQuality?.prsWithoutReviewsPercentage?.toFixed(0)}%`, icon: <AlertTriangle size={14} className="text-amber-500" />, status: codeQuality?.prsWithoutReviewsPercentage > 20 ? "text-red-600" : "text-slate-900" },
    { label: "Approval Rate", value: `${reviews.approvalRate?.toFixed(0)}%`, icon: <CheckSquare size={14} className="text-emerald-500" />, status: "text-slate-900" }
  ];
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col justify-between">
      <SectionTitle icon={<ShieldCheck size={16} className="text-indigo-500" />} title="Review Insights" tooltip="Key indicators of the code review process health." />
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3"><div className="p-1.5 bg-white rounded-lg shadow-sm">{item.icon}</div><p className="text-xs font-bold text-slate-600">{item.label}</p></div>
            <span className={`text-sm font-black ${item.status}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkHabitsWidget({ data }: { data: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <SectionTitle icon={<Clock size={16} className="text-violet-500" />} title="Daily Rhythm" />
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

function WorkBalanceWidget({ weekday, weekend }: { weekday: number; weekend: number }) {
  const total = weekday + weekend;
  const weekdayPct = total ? (weekday / total) * 100 : 0;
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col justify-center">
      <SectionTitle icon={<Scale size={16} className="text-teal-500" />} title="Work Balance" />
      <div className="flex justify-between text-xs font-bold text-slate-600 mb-2"><span>Weekday ({weekday})</span><span>Weekend ({weekend})</span></div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex"><motion.div initial={{ width: 0 }} animate={{ width: `${weekdayPct}%` }} className="h-full bg-slate-800" /><div className="h-full bg-slate-300 flex-1" /></div>
      <p className="text-[10px] text-slate-400 mt-3 text-center">{weekdayPct >= 75 ? 'Mostly Weekdays' : 'High Weekend Share'}</p>
    </div>
  );
}

function ReviewStatsWidget({ reviews }: { reviews: any }) {
  const data = formatDataForPie(reviews?.reviewsByState);
  const total = reviews?.totalReviews || 0;
  const getColor = (name: string) => { const key = name.replace(' ', '_'); return REVIEW_COLORS[key] || '#cbd5e1'; };
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <SectionTitle icon={<Eye size={16} className="text-indigo-500" />} title="Review Status" />
      <div className="flex items-center gap-2 flex-1">
        <div className="relative w-[100px] h-[100px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value" stroke="none">
                {data.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={getColor(entry.name)} />))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-sm font-black text-slate-800">{(reviews?.approvalRate ?? 0).toFixed(0)}%</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase">Approval</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
          {data.map((item: any) => (
            <div key={item.name} className="flex items-start justify-between text-xs w-full">
              <div className="flex items-start gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: getColor(item.name) }} />
                <span className="text-slate-600 font-medium capitalize leading-tight">{item.name.toLowerCase()}</span>
              </div>
              <span className="font-bold text-slate-800 ml-2">{item.value}</span>
            </div>
          ))}
          <div className="h-px bg-slate-50 w-full my-1" />
          <div className="flex items-center justify-between text-xs text-slate-400"><span>Total Reviews</span><span className="font-medium text-slate-600">{total}</span></div>
        </div>
      </div>
    </div>
  );
}

function PrStatsWidget({ prs }: { prs: any }) {
  const sizeData = [{ name: 'Small', value: prs?.smallPrCount || 0, color: '#10b981' }, { name: 'Medium', value: prs?.mediumPrCount || 0, color: '#3b82f6' }, { name: 'Large', value: prs?.largePrCount || 0, color: '#f59e0b' }];
  const maxVal = Math.max(...sizeData.map((s) => s.value), 1);
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
      <SectionTitle icon={<GitPullRequest size={16} className="text-blue-500" />} title="PR Sizes" tooltip="Breakdown of PR sizes. Smaller PRs are generally better." />
      <div className="flex items-end gap-2 h-32 mb-6 justify-around">
        {sizeData.map((d) => (
          <div key={d.name} className="flex flex-col items-center gap-1 w-1/4">
            <span className="text-xs font-bold text-slate-700">{d.value}</span>
            <div className="w-full bg-slate-100 rounded-t-lg relative h-24 overflow-hidden">
              <motion.div initial={{ height: 0 }} animate={{ height: `${(d.value / maxVal) * 100}%` }} className="absolute bottom-0 w-full rounded-t-lg" style={{ backgroundColor: d.color }} />
            </div>
            <span className="text-[10px] font-medium text-slate-400">{d.name}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
        <div><p className="text-[10px] text-slate-400 uppercase font-bold">Merge Rate</p><p className="text-lg font-bold text-slate-800">{(prs?.mergeRate ?? 0).toFixed(1)}%</p></div>
        <div><p className="text-[10px] text-slate-400 uppercase font-bold">Avg Merge Time</p><p className="text-lg font-bold text-slate-800">{(prs?.averageMergeTimeHours ?? 0).toFixed(1)}h</p></div>
      </div>
    </div>
  );
}

function TopContributorsWidget({ contributors }: { contributors: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[350px]">
      <SectionTitle icon={<Trophy size={16} className="text-yellow-500" />} title="Top Contributors" />
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-0">
        {contributors.map((c: any, i: number) => (
          <div key={c.contributorLogin} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
            <Avatar name={c.contributorLogin} size="sm" />
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{c.contributorLogin}</p><p className="text-[10px] text-slate-400">{c.totalContributions} contributions</p></div>
            <div className="text-right flex-shrink-0"><span className="block text-xs font-black text-blue-600">{c.commitCount} cmts</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopReviewersWidget({ reviewers }: { reviewers: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full min-h-[350px] flex flex-col">
      <SectionTitle icon={<Eye size={16} className="text-purple-500" />} title="Top Reviewers" />
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-0">
        {reviewers.map((r: any, idx: number) => (
          <div key={r.reviewerLogin} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded flex-shrink-0 ${idx === 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</span>
            <Avatar name={r.reviewerLogin} size="sm" />
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{r.reviewerLogin}</p><span className="text-[10px] text-slate-400">{r.reviewCount} reviews</span></div>
            <div className="text-right flex-shrink-0"><span className="text-xs font-black text-emerald-700">{(r.approvalRate ?? 0).toFixed(0)}%</span></div>
          </div>
        ))}
        {reviewers.length === 0 && <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs"><span>No reviews found</span></div>}
      </div>
    </div>
  );
}

function LanguageDonutWidget({ languages, loading }: { languages: RepoLanguage[]; loading: boolean }) {
  if (loading) return <Skeleton className="w-full h-full rounded-xl" />;
  const safeLanguages = languages || [];
  if (safeLanguages.length === 0) return <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col justify-center items-center text-slate-400"><Code2 size={24} className="mb-2 opacity-50" /><span className="text-xs">No language data</span></div>;
  const data = safeLanguages.map((l) => ({ name: l.name, value: l.percentage }));
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <SectionTitle icon={<Code2 size={16} className="text-pink-500" />} title="Top Languages" />
      <div className="flex items-center gap-2 flex-1">
        <div className="relative w-[100px] h-[100px] shrink-0">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value" stroke="none">{data.map((entry, index) => { const color = LANG_COLOR[entry.name] || CHART_COLORS[index % CHART_COLORS.length]; return <Cell key={`cell-${index}`} fill={color} />; })}</Pie><Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} /></PieChart></ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-sm font-black text-slate-800">{safeLanguages[0]?.percentage.toFixed(0)}%</span><span className="text-[8px] text-slate-400 font-bold uppercase truncate max-w-[60px]">{safeLanguages[0]?.name}</span></div>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
          {safeLanguages.slice(0, 5).map((lang, idx) => {
            const color = LANG_COLOR[lang.name] || CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <div key={lang.name} className="flex items-start justify-between text-xs w-full">
                <div className="flex items-start gap-1.5 min-w-0"><div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: color }} /><span className="text-slate-600 font-medium capitalize leading-tight">{lang.name}</span></div>
                <span className="font-black text-slate-800 ml-2">{lang.percentage.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RepositoryDetailsWidget({ overview }: { overview: any }) {
  if (!overview) return <Skeleton className="w-full h-full" />;
  const details = [
    { label: 'Forks', value: overview.forks, icon: <GitFork size={16} className="text-slate-400" /> },
    { label: 'Watchers', value: overview.watchers, icon: <Eye size={16} className="text-slate-400" /> },
    { label: 'Stars', value: overview.stars, icon: <Star size={16} className="text-amber-400" /> },
    { label: 'Open Issues', value: overview.openIssues, icon: <AlertCircle size={16} className="text-rose-400" /> },
    { label: 'Repo Age', value: `${overview.repositoryAgeDays} days`, icon: <CalendarIcon size={16} className="text-slate-400" /> },
  ];
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full min-h-[350px]">
      <SectionTitle icon={<BookOpen size={16} className="text-indigo-500" />} title="Repository Details" />
      <div className="grid grid-cols-2 gap-4">
        {details.map((item, idx) => (
          <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">{item.icon} {item.label}</div>
            <div className="text-lg font-bold text-slate-800">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400"><span>Last Synced:</span><span className="font-medium text-slate-600">{timeAgo(overview.lastSyncedAt)}</span></div>
    </div>
  );
}

function ProductivityChart({ data }: { data: { hour: number; count: number }[] }) {
  return (
    <div className="flex flex-col h-full">
      <SectionTitle icon={<Clock size={16} className="text-orange-500" />} title="Productivity Hours" />
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>{data.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.count > 0 ? '#fb923c' : '#fed7aa'} />))}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------- PAGE COMPONENT ---------- */
export default function DashboardPage() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [languages, setLanguages] = useState<RepoLanguage[]>([]);
  const [repoMetrics, setRepoMetrics] = useState<RepoMetricsDto | null>(null);

  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [weekRange, setWeekRange] = useState<WeekRange>('30d');

  useEffect(() => {
    const loadRepos = async () => {
      if (!user) return;
      try {
        setLoadingRepos(true);
        let data = await getUserRepos();
        if (!data.length) { await initUserRepos(); data = await getUserRepos(); }
        setRepos(data);
        if (!selectedRepoId && data[0]) setSelectedRepoId(data[0].id);
      } catch (e) { showError('Failed to load repositories.'); } finally { setLoadingRepos(false); }
    };
    loadRepos();
  }, [user]);

  const uniqueOrgs = useMemo(() => {
    const orgs = new Set(repos.map((r) => (r as any).ownerLogin || 'Unknown'));
    return ['All', ...Array.from(orgs)];
  }, [repos]);

  const filteredRepos = useMemo(() => {
    if (selectedOrg === 'All') return repos;
    return repos.filter((r) => (r as any).ownerLogin === selectedOrg);
  }, [repos, selectedOrg]);

  const handleOrgChange = (org: string) => {
    setSelectedOrg(org);
    const firstRepoInOrg = repos.find((r) => org === 'All' ? true : (r as any).ownerLogin === org);
    if (firstRepoInOrg) setSelectedRepoId(firstRepoInOrg.id);
  };

  const fetchData = async (forceSync = false) => {
    if (!repos.length) return;
    const targetRepo = repos.find((r) => r.id === selectedRepoId);
    if (!targetRepo) return;
    const token = (user as any)?.accessToken || (user as any)?.token || localStorage.getItem('token');

    setLoadingMetrics(true);
    setRepoMetrics(null);

    try {
      // 1) Ensure branches exist (DB boşken branch yok; önce init et ki commit sync çalışsın)
      let branches = await getBranchesByRepo(targetRepo.fullName).catch(() => []);
      if (!branches.length) {
        await initBranchesByRepo(targetRepo.fullName);
        branches = await getBranchesByRepo(targetRepo.fullName).catch(() => []);
      }

      setLoadingCommits(true);
      try {
        const uniqueCommitsMap = new Map<string, Commit>();
        const results = await Promise.all(branches.map(async (br: any) => {
          if (forceSync) await initCommits(targetRepo.fullName, br.name);
          let cList = await queryCommits(targetRepo.fullName, br.name);
          if (!cList.length && !forceSync) {
            await initCommits(targetRepo.fullName, br.name);
            cList = await queryCommits(targetRepo.fullName, br.name);
          }
          return cList;
        }));
        results.flat().forEach((c: any) => { if (c.sha) uniqueCommitsMap.set(c.sha, c); });
        setCommits(Array.from(uniqueCommitsMap.values()));
        if (forceSync) showSuccess('Data synchronized.');
      } catch (e) { showError('Failed to load commit data.'); } finally { setLoadingCommits(false); }

      setLoadingPrs(true);
      try {
        if (forceSync) await initPullRequests(targetRepo.fullName);
        let data = await queryPullRequests(targetRepo.fullName);
        if (!data.length && !forceSync) {
          await initPullRequests(targetRepo.fullName);
          data = await queryPullRequests(targetRepo.fullName);
        }
        setPrs(data);
      } catch { } finally { setLoadingPrs(false); }

      setLoadingLanguages(true);
      try {
        if (forceSync) await initLanguages(targetRepo.fullName, token);
        await initLanguages(targetRepo.fullName, token);
        const langData = await getRepoLanguages(targetRepo.fullName, token);
        if (langData?.items?.length) {
          const totalBytes = langData.items.reduce((a: number, b: any) => a + b.bytes, 0);
          setLanguages(langData.items.map((l: any) => ({ ...l, percentage: totalBytes ? (l.bytes / totalBytes) * 100 : 0 })));
        } else { setLanguages([]); }
      } catch { setLanguages([]); } finally { setLoadingLanguages(false); }

      // 2) Sync bittikten sonra metrics al; kullanıcı sadece dolu sonucu görsün
      const metricsData = await getRepoMetrics(targetRepo.fullName, token);
      setRepoMetrics(metricsData);
    } catch (err) {
      console.warn('Dashboard data error', err);
      showError('Failed to load dashboard data.');
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => { fetchData(false); }, [selectedRepoId]);
  const handleRefresh = () => fetchData(true);

  const selectedRepo = useMemo(() => repos.find((r) => r.id === selectedRepoId) || null, [repos, selectedRepoId]);
  const radarData = useMemo(() => formatDataForRadar((repoMetrics as any)?.commits?.commitsByDayOfWeek), [repoMetrics]);
  // Productivity Hours: prefer backend repo metrics (commitsByHour) when available; fallback to client-side from commit list
  const commitsByHour = useMemo(() => {
    const fromMetrics = (repoMetrics as any)?.commits?.commitsByHour;
    if (fromMetrics && typeof fromMetrics === 'object') {
      return Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: Number(fromMetrics[i] ?? fromMetrics[String(i)] ?? 0),
      }));
    }
    return getCommitsByHour(commits);
  }, [repoMetrics, commits]);
  const chartData = useMemo(() => buildChartData(commits, weekRange), [commits, weekRange]);
  const activityData = useMemo(() => {
    const weekly = (repoMetrics as any)?.activityTrend?.weeklyTrend || [];
    return weekly.map((w: any) => ({ name: w.week.split('-W')[1], commits: w.commits, prs: w.pullRequests, reviews: w.reviews, displayDate: w.week }));
  }, [repoMetrics]);

  const totalCommits = (repoMetrics as any)?.commits?.totalCommits ?? commits.length;
  const openIssues = (repoMetrics as any)?.overview?.openIssues ?? 0;
  const activeContrib = (repoMetrics as any)?.contributors?.activeContributorsLast30Days ?? 0;
  const topContributors = (repoMetrics as any)?.contributors?.topContributorsByCommits || [];
  const topReviewers = (repoMetrics as any)?.reviews?.topReviewers || [];

  return (
    <div className="min-h-screen bg-[#FAFBFC] p-6 lg:p-8 font-sans text-slate-900">
      <style>{scrollbarStyles}</style>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="text-blue-600" /> Analytics Dashboard
            <InfoTooltip text="Repo-level cockpit for commits, PRs, reviews, and quality signals." />
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">{selectedRepo?.name ? `Deep dive into ${selectedRepo.name}` : 'Select a repository'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm min-w-[140px]">
            <Dropdown label="Org" items={uniqueOrgs.map((o) => ({ label: o, value: o }))} value={selectedOrg} onChange={handleOrgChange} />
          </div>
          <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm min-w-[200px]">
            <Dropdown label="Repository" items={filteredRepos.map((r) => ({ label: r.name, value: r.id }))} value={selectedRepoId || ''} onChange={setSelectedRepoId} />
          </div>
          <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm">
            {loadingRepos || loadingMetrics ? <LoadingSpinner size="sm" /> : <RefreshCw size={18} className="text-slate-500" />}
          </button>
        </div>
      </div>

      {repoMetrics ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-1"><KpiCard title="Total Commits" value={totalCommits} icon={<GitCommit size={20} className="text-blue-600" />} iconBg="bg-blue-50" tooltip="Total commits in the selected repo." /></div>
            <div className="lg:col-span-1"><KpiCard title="Open Issues" value={openIssues} icon={<AlertOctagon size={20} className="text-rose-600" />} iconBg="bg-rose-50" tooltip="Current open issues count." /></div>
            <div className="lg:col-span-1"><KpiCard title="Active Contributors" value={activeContrib} icon={<Users size={20} className="text-purple-600" />} iconBg="bg-purple-50" tooltip="Contributors active in the last 30 days." /></div>
            <div className="lg:col-span-1"><KpiCard title="Repo Activity" value="Active" icon={<Zap size={20} className="text-yellow-600" />} iconBg="bg-yellow-50" tooltip="General repository status based on recent pushes." /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <div className="lg:col-span-4"><HealthScoreWidget metrics={repoMetrics} /></div>
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={16} className="text-blue-500" /> Activity Trend</h3>
                <div className="scale-90 origin-right"><TabPill label="7d" active={weekRange === '7d'} onClick={() => setWeekRange('7d')} /><TabPill label="30d" active={weekRange === '30d'} onClick={() => setWeekRange('30d')} /></div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekRange === '30d' && activityData.length ? activityData : chartData}>
                    <defs><linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={weekRange === '30d' && activityData.length ? 'name' : 'displayDate'} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="commits" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCommits)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <WorkHabitsWidget data={radarData} />
            <WorkBalanceWidget weekday={(repoMetrics as any).commits?.weekdayCommits || 0} weekend={(repoMetrics as any).commits?.weekendCommits || 0} />
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <SectionTitle icon={<Clock size={16} className="text-orange-500" />} title="Productivity Hours" />
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commitsByHour}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>{commitsByHour.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.count > 0 ? '#fb923c' : '#fed7aa'} />))}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-1"><CodeVelocityWidget quality={(repoMetrics as any).codeQuality} /></div>
            <div className="lg:col-span-1"><ReviewInsightsWidget reviews={(repoMetrics as any).reviews} codeQuality={(repoMetrics as any).codeQuality} /></div>
            <div className="lg:col-span-1"><ReviewStatsWidget reviews={(repoMetrics as any).reviews} /></div>
            <div className="lg:col-span-1"><LanguageDonutWidget languages={languages} loading={loadingLanguages} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2"><PrStatsWidget prs={(repoMetrics as any).pullRequests} /></div>
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <SectionTitle icon={<ShieldCheck size={16} className="text-teal-500" />} title="Quality Gates" tooltip="Actionable process quality signals." />
              <div className="space-y-3">
                <MetricRow label="Net Code Change" value={`${(repoMetrics as any)?.codeQuality?.netCodeChange > 0 ? '+' : ''}${(repoMetrics as any)?.codeQuality?.netCodeChange ?? 0}`} tone={(repoMetrics as any)?.codeQuality?.netCodeChange > 0 ? 'good' : 'default'} />
                <MetricRow label="Avg Commit Msg" value={`${(repoMetrics as any)?.codeQuality?.averageCommitMessageLength ?? 0} chars`} />
                <MetricRow label="Regular Commits" value={`${((repoMetrics as any)?.codeQuality?.regularCommitPercentage ?? 0).toFixed(1)}%`} tone="info" />
              </div>
            </div>
          </div>

          {/* FIX: Equal height row for Top Contributors, Top Reviewers, and Repo Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 auto-rows-fr">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
              <SectionTitle icon={<ShieldCheck size={16} className="text-teal-500" />} title="Quality Gates" />
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><span className="text-xs font-bold text-slate-600">Net Code Change</span><span className={`text-sm font-bold ${(repoMetrics as any).codeQuality?.netCodeChange > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{(repoMetrics as any).codeQuality?.netCodeChange > 0 ? '+' : ''}{(repoMetrics as any).codeQuality?.netCodeChange}</span></div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><span className="text-xs font-bold text-slate-600">Growth Rate</span><span className="text-sm font-bold text-blue-600">{(repoMetrics as any).codeQuality?.codeGrowthRate?.toFixed(1)}%</span></div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><span className="text-xs font-bold text-slate-600">Overall Quality</span><span className="text-sm font-bold text-emerald-600">{(repoMetrics as any).codeQuality?.overallQualityScore?.toFixed(1)}/100</span></div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><span className="text-xs font-bold text-slate-600">Avg Commit Msg</span><span className="text-sm font-bold text-slate-800">{(repoMetrics as any).codeQuality?.averageCommitMessageLength} chars</span></div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><span className="text-xs font-bold text-slate-600">Regular Commits</span><span className="text-sm font-bold text-blue-600">{((repoMetrics as any).codeQuality?.regularCommitPercentage ?? 0).toFixed(1)}%</span></div>
              </div>
            </div>
            <TopContributorsWidget contributors={topContributors} />
            <TopReviewersWidget reviewers={topReviewers} />
            <RepositoryDetailsWidget overview={(repoMetrics as any).overview} />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[500px]">{loadingMetrics ? <LoadingSpinner size="lg" /> : <div className="text-slate-400">Select a repository to view analytics</div>}</div>
      )}
    </div>
  );
}