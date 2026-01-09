// src/pages/dashboard/DashboardPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import {
  Activity,
  AlertOctagon,
  Calendar as CalendarIcon,
  Clock,
  Code2,
  Flame,
  FolderGit,
  GitCommit,
  GitPullRequest,
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
  BarChart3,
  BadgeCheck,
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
  YAxis,
} from 'recharts';

import { useAuth } from '@/shared/contexts/AuthContext';
import { useToast } from '@/shared/contexts/ToastContext';
import { getUserRepos, initUserRepos } from '@/shared/lib/repo-api';
import { getBranchesByRepo } from '@/shared/lib/branch-api';
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
type RecentCommit = {
  repo: string;
  author: string;
  msg: string;
  time: string;
  rawDate: number;
  sha?: string;
};

/* ---------- STYLES ---------- */
const heatmapStyles = `
  .react-calendar-heatmap text { font-size: 9px; fill: #9ca3af; }
  .react-calendar-heatmap .color-empty { fill: #ebedf0; }
  .react-calendar-heatmap .color-scale-1 { fill: #9be9a8; }
  .react-calendar-heatmap .color-scale-2 { fill: #40c463; }
  .react-calendar-heatmap .color-scale-3 { fill: #30a14e; }
  .react-calendar-heatmap .color-scale-4 { fill: #216e39; }
  .react-calendar-heatmap rect { rx: 2px; stroke: #fff; stroke-width: 1px; }

  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
`;

/* ---------- CONSTANTS ---------- */
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
  HTML: '#E34C26',
  CSS: '#563D7C',
  Shell: '#89e051',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const REVIEW_COLORS: Record<string, string> = {
  APPROVED: '#10b981',
  CHANGES_REQUESTED: '#f59e0b',
  COMMENTED: '#3b82f6',
};

/* ---------- UTILS ---------- */
function safeDateLabel(dateStr?: string | null) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString();
}

function calculateStreak(commits: Commit[]): number {
  if (!commits.length) return 0;
  const dates = Array.from(
    new Set(
      commits
        .map((c) => (c.committedAt ? new Date(c.committedAt).toISOString().split('T')[0] : ''))
        .filter(Boolean),
    ),
  ).sort().reverse();

  if (!dates.length) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  let currentDate = new Date(dates[0]);

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i]);
    const diffDays = Math.ceil(
      Math.abs(currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 1) {
      streak++;
      currentDate = prevDate;
    } else break;
  }
  return streak;
}

function getCommitsByHour(commits: Commit[]) {
  const data = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  commits.forEach((c) => {
    if (!c.committedAt) return;
    const h = new Date(c.committedAt).getHours();
    data[h].count++;
  });
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

function getHeatmapData(commits: Commit[]): any[] {
  const map = new Map<string, number>();
  commits.forEach((c) => {
    if (!c.committedAt) return;
    const dateStr = new Date(c.committedAt).toISOString().split('T')[0];
    map.set(dateStr, (map.get(dateStr) || 0) + 1);
  });
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

function buildChartData(commits: Commit[], range: WeekRange) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const today = new Date();
  const map = new Map<string, number>();

  commits.forEach((c) => {
    if (!c.committedAt) return;
    const key = new Date(c.committedAt).toISOString().split('T')[0];
    map.set(key, (map.get(key) || 0) + 1);
  });

  const data: { date: string; displayDate: string; commits: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    data.push({
      date: key,
      displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      commits: map.get(key) || 0,
    });
  }
  return data;
}

/* ---------- UI HELPERS ---------- */
function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black cursor-help select-none">
      i
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[360px] p-3 bg-slate-900 text-white text-[11px] leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none shadow-xl border border-slate-700">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}

function SectionTitle({ icon, title, tip, right }: { icon: React.ReactNode; title: string; tip?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {tip ? <InfoTip text={tip} /> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function MetricRow({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' | 'info' }) {
  const valueClass = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : tone === 'bad' ? 'text-rose-700' : tone === 'info' ? 'text-indigo-700' : 'text-slate-800';
  return (
    <div className="flex justify-between items-center px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
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

/* ---------- KPI ---------- */
function KpiCard({ title, value, icon, iconBg, tip }: { title: string; value: number | string; icon: React.ReactNode; iconBg: string; tip?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 h-full flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">{title}</p>
          {tip ? <InfoTip text={tip} /> : null}
        </div>
        <h3 className="text-3xl font-black text-slate-900 mt-1">
          {typeof value === 'number' ? <CountUp end={value} duration={1.6} separator="," /> : value}
        </h3>
      </div>
      <div className={`p-3 rounded-xl ${iconBg}`}>{icon}</div>
    </div>
  );
}

/* ---------- WIDGETS ---------- */
function HealthScoreWidget({ metrics }: { metrics: RepoMetricsDto }) {
  const score = metrics.healthScore?.overallHealthScore ?? 0;
  const status = metrics.healthScore?.healthStatus || 'N/A';
  const items = [
    { label: 'Activity', val: metrics.healthScore?.activityScore ?? 0 },
    { label: 'Quality', val: metrics.healthScore?.codeQualityScore ?? 0 },
    { label: 'Community', val: metrics.healthScore?.communityScore ?? 0 },
    { label: 'Popularity', val: metrics.healthScore?.popularityScore ?? 0 },
  ];
  const scoreTone = score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-blue-700' : score >= 40 ? 'text-amber-700' : 'text-rose-700';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <SectionTitle
        icon={<HeartIcon />}
        title="Repository Health"
        tip="A consolidated 0–100 score combining Activity, Quality, Community, and Popularity. Use it as a fast snapshot; validate with the panels below."
        right={<span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${score >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{status}</span>}
      />
      <div className="flex items-end gap-2 mb-6">
        <span className={`text-5xl font-black tracking-tighter ${scoreTone}`}>
          <CountUp end={score} duration={2.0} decimals={2} />
        </span>
        <span className="text-sm font-medium text-slate-400 mb-1.5">/100</span>
      </div>
      <div className="space-y-4 flex-1">
        {items.map((i) => (
          <div key={i.label}>
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 mb-1">
              <span>{i.label}</span>
              <span>{i.val.toFixed(0)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${i.val}%` }}
                transition={{ duration: 0.9 }}
                className={`h-full rounded-full ${i.val >= 80 ? 'bg-emerald-500' : i.val >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeartIcon() {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-rose-50">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-rose-500">
        <path d="M12 21s-7-4.35-9.33-8.02C.27 9.07 2.14 5.5 5.93 5.5c1.9 0 3.28 1.02 4.07 2.08.79-1.06 2.17-2.08 4.07-2.08 3.79 0 5.66 3.57 3.26 7.48C19 16.65 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function WorkHabitsWidget({ data }: { data: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <SectionTitle icon={<Clock size={16} className="text-violet-500" />} title="Daily Rhythm" tip="Commit distribution across weekdays. Helps identify whether work is balanced or concentrated on certain days (batching, deadlines, etc.)." />
      <div className="flex-1 min-h-[220px] -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Radar name="Commits" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.35} />
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
      <SectionTitle icon={<Scale size={16} className="text-teal-500" />} title="Work Balance" tip="Weekday vs weekend commit share. High weekend share can indicate crunch time or personal preference—interpret with team norms." />
      <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
        <span>Weekday ({weekday})</span>
        <span>Weekend ({weekend})</span>
      </div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
        <motion.div initial={{ width: 0 }} animate={{ width: `${weekdayPct}%` }} className="h-full bg-slate-800" />
        <div className="h-full bg-slate-300 flex-1" />
      </div>
      <p className="text-[10px] text-slate-400 mt-3 text-center">{weekdayPct >= 75 ? 'Mostly Weekdays' : 'High Weekend Share'}</p>
    </div>
  );
}

function ReviewStatsWidget({ reviews }: { reviews: any }) {
  const data = formatDataForPie(reviews?.reviewsByState);
  const total = reviews?.totalReviews || 0;
  const getColor = (name: string) => {
    const key = name.replace(' ', '_');
    return REVIEW_COLORS[key] || '#cbd5e1';
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <SectionTitle icon={<Eye size={16} className="text-indigo-500" />} title="Review Status" tip="Distribution of review outcomes (APPROVED / CHANGES REQUESTED / COMMENTED). Use this as a process signal, not a performance grade." />
      <div className="flex items-center gap-3 flex-1">
        <div className="relative w-[110px] h-[110px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={40} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none">
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-sm font-black text-slate-800">{(reviews?.approvalRate ?? 0).toFixed(0)}%</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase">Approval</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          {data.map((item: any) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(item.name) }} />
                <span className="text-slate-600 font-medium truncate">{item.name}</span>
              </div>
              <span className="font-bold text-slate-800">{item.value}</span>
            </div>
          ))}
          <div className="h-px bg-slate-100" />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Reviews</span>
            <span className="font-medium text-slate-600">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrStatsWidget({ prs }: { prs: any }) {
  const sizeData = [
    { name: 'Small', value: prs?.smallPrCount || 0, color: '#10b981' },
    { name: 'Medium', value: prs?.mediumPrCount || 0, color: '#3b82f6' },
    { name: 'Large', value: prs?.largePrCount || 0, color: '#f59e0b' },
  ];
  const maxVal = Math.max(...sizeData.map((s) => s.value), 1);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
      <SectionTitle icon={<GitPullRequest size={16} className="text-blue-500" />} title="PR Sizes" tip="PR size distribution. Smaller PRs are easier to review and less risky to merge; large PRs often increase cycle time and defect risk." />
      <div className="flex items-end gap-3 h-32 mb-6 justify-around">
        {sizeData.map((d) => (
          <div key={d.name} className="flex flex-col items-center gap-1 w-1/4">
            <span className="text-xs font-bold text-slate-700">{d.value}</span>
            <div className="w-full bg-slate-100 rounded-t-lg relative h-24 overflow-hidden">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.value / maxVal) * 100}%` }}
                className="absolute bottom-0 w-full rounded-t-lg"
                style={{ backgroundColor: d.color }}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-400">{d.name}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold">Merge Rate</p>
          <p className="text-lg font-bold text-slate-800">{(prs?.mergeRate ?? 0).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold">Avg Merge Time</p>
          <p className="text-lg font-bold text-slate-800">{(prs?.averageMergeTimeHours ?? 0).toFixed(1)}h</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatPill label="Largest PR" value={`${(prs?.largestPrSize ?? 0).toLocaleString()} lines`} tone="warn" />
        <StatPill label="Avg Total Changes" value={`${(prs?.averageTotalChanges ?? 0).toFixed(0)}`} />
        <StatPill label="PRs (7d)" value={`${prs?.prsLast7Days ?? 0}`} />
        <StatPill label="PRs (30d)" value={`${prs?.prsLast30Days ?? 0}`} />
      </div>
    </div>
  );
}

function StatPill({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warn' }) {
  return (
    <div className={`p-3 rounded-lg border ${tone === 'warn' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
      <p className={`text-[10px] uppercase font-bold ${tone === 'warn' ? 'text-rose-700' : 'text-slate-400'}`}>{label}</p>
      <p className={`text-sm font-black ${tone === 'warn' ? 'text-rose-800' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function TopContributorsWidget({ contributors }: { contributors: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[350px]">
      <SectionTitle icon={<Trophy size={16} className="text-yellow-500" />} title="Top Contributors" tip="Most active contributors (typically by commits). Useful for workload distribution and bus-factor assessment." />
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-0">
        {contributors.map((c: any, i: number) => (
          <div key={c.contributorLogin} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
            <span className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-lg shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-500'}`}>
              {i + 1}
            </span>
            <Avatar name={c.contributorLogin} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{c.contributorLogin}</p>
              <p className="text-[10px] text-slate-400">{c.totalContributions} total contributions</p>
            </div>
            <span className="text-xs font-black text-blue-700 shrink-0">{c.commitCount} cmts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopReviewersWidget({ reviewers }: { reviewers: any[] }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full min-h-[350px] flex flex-col">
      <SectionTitle icon={<Eye size={16} className="text-purple-500" />} title="Top Reviewers" tip="People who perform the most reviews. Helps detect review bottlenecks and whether quality responsibility is balanced." />
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-0">
        {reviewers.map((r: any, idx: number) => (
          <div key={r.reviewerLogin} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
            <span className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-lg shrink-0 ${idx === 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
              {idx + 1}
            </span>
            <Avatar name={r.reviewerLogin} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{r.reviewerLogin}</p>
              <p className="text-[10px] text-slate-400">{r.reviewCount} reviews</p>
            </div>
            <span className="text-xs font-black text-emerald-700 shrink-0">{(r.approvalRate ?? 0).toFixed(0)}%</span>
          </div>
        ))}
        {reviewers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
            <span>No reviews found</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguageDonutWidget({ languages, loading }: { languages: RepoLanguage[]; loading: boolean }) {
  if (loading) return <Skeleton className="w-full h-full rounded-2xl" />;
  const safeLanguages = languages || [];
  if (safeLanguages.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col justify-center items-center text-slate-400">
        <Code2 size={24} className="mb-2 opacity-50" />
        <span className="text-xs">No language data</span>
      </div>
    );
  }
  const data = safeLanguages.map((l) => ({ name: l.name, value: l.percentage }));
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
      <SectionTitle icon={<Code2 size={16} className="text-pink-500" />} title="Top Languages" tip="Language composition of the repository. Helps understand tooling complexity and required contributor skill set." />
      <div className="flex items-center gap-3 flex-1">
        <div className="relative w-[120px] h-[120px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={42} outerRadius={58} paddingAngle={4} dataKey="value" stroke="none">
                {data.map((entry, index) => {
                  const color = LANG_COLOR[entry.name] || CHART_COLORS[index % CHART_COLORS.length];
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-sm font-black text-slate-800">{safeLanguages[0]?.percentage.toFixed(0)}%</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[80px]">{safeLanguages[0]?.name}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          {safeLanguages.slice(0, 6).map((lang, idx) => {
            const color = LANG_COLOR[lang.name] || CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <div key={lang.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-slate-600 font-medium truncate">{lang.name}</span>
                </div>
                <span className="font-black text-slate-800">{lang.percentage.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RepoPulseWidget({ metrics }: { metrics: any }) {
  const daysSinceLastPush = metrics?.overview?.daysSinceLastPush ?? null;
  const repoAgeDays = metrics?.overview?.repositoryAgeDays ?? null;
  const lastSyncedAt = metrics?.overview?.lastSyncedAt ?? null;
  const isActive = metrics?.overview?.isActive ?? null;
  const defaultBranch = metrics?.overview?.defaultBranch ?? 'N/A';
  const commits7 = metrics?.commits?.commitsLast7Days ?? 0;
  const commits30 = metrics?.commits?.commitsLast30Days ?? 0;
  const prs7 = metrics?.pullRequests?.prsLast7Days ?? 0;
  const prs30 = metrics?.pullRequests?.prsLast30Days ?? 0;
  const reviews7 = metrics?.reviews?.reviewsLast7Days ?? 0;
  const reviews30 = metrics?.reviews?.reviewsLast30Days ?? 0;
  const mostActiveWeek = metrics?.activityTrend?.mostActiveWeek ?? 'N/A';
  const mostActiveMonth = metrics?.activityTrend?.mostActiveMonth ?? 'N/A';
  const freshnessTone = daysSinceLastPush == null ? 'bg-slate-50 text-slate-600 border-slate-100' : daysSinceLastPush <= 7 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : daysSinceLastPush <= 30 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full min-h-[350px] flex flex-col">
      <SectionTitle icon={<Timer size={16} className="text-cyan-600" />} title="Repo Pulse" tip="Operational snapshot: freshness, sync time, repository age, default branch, and 7/30-day activity for commits/PRs/reviews." />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`p-3 rounded-lg border ${freshnessTone}`}>
          <p className="text-[10px] uppercase font-bold opacity-70">Freshness</p>
          <p className="text-sm font-black">{daysSinceLastPush == null ? 'N/A' : `${daysSinceLastPush}d since push`}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-400">Repo Age</p>
          <p className="text-sm font-black text-slate-800">{repoAgeDays == null ? 'N/A' : `${repoAgeDays} days`}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-400">Default Branch</p>
          <p className="text-sm font-black text-slate-800 truncate" title={defaultBranch}>{defaultBranch}</p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-400">Last Synced</p>
          <p className="text-xs font-black text-slate-700 truncate" title={safeDateLabel(lastSyncedAt)}>{safeDateLabel(lastSyncedAt)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BadgeCheck size={14} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
          <span className="text-xs font-bold text-slate-700">{isActive ? 'Active repo' : 'Inactive repo'}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400">Peaks</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatPill label="Commits (7/30)" value={`${commits7} / ${commits30}`} />
        <StatPill label="PRs (7/30)" value={`${prs7} / ${prs30}`} />
        <StatPill label="Reviews (7/30)" value={`${reviews7} / ${reviews30}`} />
      </div>
      <div className="mt-auto grid grid-cols-2 gap-3">
        <StatPill label="Most Active Week" value={`${mostActiveWeek}`} />
        <StatPill label="Most Active Month" value={`${mostActiveMonth}`} />
      </div>
    </div>
  );
}

/* ---------- PAGE ---------- */
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
  const [recent, setRecent] = useState<RecentCommit[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [weekRange, setWeekRange] = useState<WeekRange>('30d');
  const [repoError, setRepoError] = useState<AppError | null>(null);

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
        if (!selectedRepoId && data[0]) setSelectedRepoId(data[0].id);
      } catch (e) {
        setRepoError(e as AppError);
        showError('Failed to load repositories.');
      } finally {
        setLoadingRepos(false);
      }
    };
    loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const firstRepoInOrg = repos.find((r) => (org === 'All' ? true : (r as any).ownerLogin === org));
    if (firstRepoInOrg) setSelectedRepoId(firstRepoInOrg.id);
  };

  const fetchMetrics = async (repoFullName: string) => {
    setLoadingMetrics(true);
    setRepoMetrics(null);
    try {
      const token = (user as any)?.accessToken || (user as any)?.token || localStorage.getItem('token');
      const data = await getRepoMetrics(repoFullName, token);
      setRepoMetrics(data);
    } catch (err) {
      console.warn('Repo metrics error', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchData = async (forceSync = false) => {
    if (!repos.length) return;
    const targetRepo = repos.find((r) => r.id === selectedRepoId);
    if (!targetRepo) return;
    const token = (user as any)?.accessToken || (user as any)?.token || localStorage.getItem('token');
    await fetchMetrics(targetRepo.fullName);

    // Commits (also builds Recent Commits)
    try {
      const branches = await getBranchesByRepo(targetRepo.fullName).catch(() => []);
      const uniqueCommitsMap = new Map<string, Commit>();
      const recentsRaw: RecentCommit[] = [];
      const results = await Promise.all(
        branches.map(async (br: any) => {
          if (forceSync) await initCommits(targetRepo.fullName, br.name);
          let cList = await queryCommits(targetRepo.fullName, br.name);
          if (!cList.length && !forceSync) {
            await initCommits(targetRepo.fullName, br.name);
            cList = await queryCommits(targetRepo.fullName, br.name);
          }
          return cList;
        }),
      );
      results.flat().forEach((c: any) => {
        if (c.sha && !uniqueCommitsMap.has(c.sha)) {
          uniqueCommitsMap.set(c.sha, c);
          recentsRaw.push({
            repo: targetRepo.fullName,
            author: c.authorLogin || c.authorName || 'unknown',
            msg: (c.message || 'No message').replace(/\s+/g, ' ').trim(),
            time: c.committedAt ? new Date(c.committedAt).toLocaleString() : 'N/A',
            rawDate: c.committedAt ? new Date(c.committedAt).getTime() : 0,
            sha: c.sha,
          });
        }
      });
      setCommits(Array.from(uniqueCommitsMap.values()));
      recentsRaw.sort((a, b) => b.rawDate - a.rawDate);
      setRecent(recentsRaw.slice(0, 15));
      if (forceSync) showSuccess('Data synchronized.');
    } catch (e) {
      console.warn('Commit load error', e);
    }

    // PRs
    try {
      if (forceSync) await initPullRequests(targetRepo.fullName);
      let data = await queryPullRequests(targetRepo.fullName);
      if (!data.length && !forceSync) {
        await initPullRequests(targetRepo.fullName);
        data = await queryPullRequests(targetRepo.fullName);
      }
      setPrs(data);
    } catch (e) {
      console.warn('PR load error', e);
    }

    // Languages
    setLoadingLanguages(true);
    try {
      if (forceSync) await initLanguages(targetRepo.fullName, token);
      await initLanguages(targetRepo.fullName, token);
      const langData = await getRepoLanguages(targetRepo.fullName, token);
      if (langData?.items?.length) {
        const totalBytes = langData.items.reduce((a: number, b: any) => a + b.bytes, 0);
        setLanguages(langData.items.map((l: any) => ({ ...l, percentage: totalBytes ? (l.bytes / totalBytes) * 100 : 0 })));
      } else {
        setLanguages([]);
      }
    } catch (e) {
      console.warn('Language load error', e);
      setLanguages([]);
    } finally {
      setLoadingLanguages(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepoId]);

  const handleRefresh = () => fetchData(true);
  const selectedRepo = useMemo(() => repos.find((r) => r.id === selectedRepoId) || null, [repos, selectedRepoId]);
  const radarData = useMemo(() => formatDataForRadar((repoMetrics as any)?.commits?.commitsByDayOfWeek), [repoMetrics]);
  const commitsByHour = useMemo(() => getCommitsByHour(commits), [commits]);
  const heatmapData = useMemo(() => getHeatmapData(commits), [commits]);
  const chartData = useMemo(() => buildChartData(commits, weekRange), [commits, weekRange]);
  const activityData = useMemo(() => {
    const weekly = (repoMetrics as any)?.activityTrend?.weeklyTrend || [];
    return weekly.map((w: any) => ({ name: w.week.split('-W')[1], commits: w.commits, prs: w.pullRequests, reviews: w.reviews, displayDate: w.week }));
  }, [repoMetrics]);

  const totalCommits = useMemo(() => (repoMetrics as any)?.commits?.totalCommits ?? commits.length, [repoMetrics, commits.length]);
  const openIssues = useMemo(() => (repoMetrics as any)?.overview?.openIssues ?? 0, [repoMetrics]);
  const activeContrib = useMemo(() => (repoMetrics as any)?.contributors?.activeContributorsLast30Days ?? 0, [repoMetrics]);
  const activityGrowthRate = useMemo(() => (repoMetrics as any)?.activityTrend?.activityGrowthRate ?? null, [repoMetrics]);
  const streak = useMemo(() => calculateStreak(commits), [commits]);
  const peakHour = useMemo(() => (repoMetrics as any)?.commits?.mostActiveHour ?? null, [repoMetrics]);
  const mergePct = useMemo(() => (repoMetrics as any)?.commits?.mergeCommitPercentage ?? null, [repoMetrics]);
  const prReviewCoverage = useMemo(() => (repoMetrics as any)?.reviews?.prsWithReviewsPercentage ?? null, [repoMetrics]);
  const prsWithoutReviewsPct = useMemo(() => (repoMetrics as any)?.codeQuality?.prsWithoutReviewsPercentage ?? null, [repoMetrics]);
  const largestPrSize = useMemo(() => (repoMetrics as any)?.pullRequests?.largestPrSize ?? null, [repoMetrics]);
  const topContributors = useMemo(() => (repoMetrics as any)?.contributors?.topContributorsByCommits || [], [repoMetrics]);
  const topReviewers = useMemo(() => (repoMetrics as any)?.reviews?.topReviewers || [], [repoMetrics]);
  const daysSinceLastPush = useMemo(() => (repoMetrics as any)?.overview?.daysSinceLastPush ?? null, [repoMetrics]);
  const freshnessBadge = useMemo(() => {
    if (daysSinceLastPush == null) return { cls: 'bg-slate-100 text-slate-600 border-slate-200', text: 'Freshness N/A' };
    if (daysSinceLastPush <= 7) return { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: `Last push ${daysSinceLastPush}d ago` };
    if (daysSinceLastPush <= 30) return { cls: 'bg-amber-50 text-amber-700 border-amber-100', text: `Last push ${daysSinceLastPush}d ago` };
    return { cls: 'bg-rose-50 text-rose-700 border-rose-100', text: `Last push ${daysSinceLastPush}d ago` };
  }, [daysSinceLastPush]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] p-6 lg:p-8 font-sans text-slate-900">
      <style>{heatmapStyles}</style>
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics Dashboard</h1>
            <InfoTip text="Repo-level cockpit for commits, PRs, reviews, quality signals, and activity trends." />
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">{selectedRepo?.name ? `Deep dive into ${selectedRepo.name}` : 'Select a repository'}</p>
          {repoMetrics && (
            <div className="flex gap-3 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100"><Star size={12} /> {(repoMetrics.overview as any)?.stars} Stars</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200"><FolderGit size={12} /> {(repoMetrics.overview as any)?.size} KB</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100"><Code2 size={12} /> {(repoMetrics.overview as any)?.primaryLanguage}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border ${freshnessBadge.cls}`}><Zap size={12} /> {freshnessBadge.text}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
          <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm min-w-[140px]"><Dropdown label="Org" items={uniqueOrgs.map((o) => ({ label: o, value: o }))} value={selectedOrg} onChange={handleOrgChange} /></div>
          <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm min-w-[220px]"><Dropdown label="Repository" items={filteredRepos.map((r) => ({ label: r.name, value: r.id }))} value={selectedRepoId || ''} onChange={setSelectedRepoId} /></div>
          <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm" title="Refresh">{loadingRepos || loadingMetrics ? <LoadingSpinner size="sm" /> : <RefreshCw size={18} className="text-slate-500" />}</button>
        </div>
      </div>

      {/* BODY */}
      {repoMetrics ? (
        <>
          {/* ROW 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-stretch">
            <div className="lg:col-span-3">
              <HealthScoreWidget metrics={repoMetrics} />
            </div>
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <SectionTitle icon={<TrendingUp size={16} className="text-blue-500" />} title="Activity Trend" tip="How commit activity evolves. Use 7/30/90-day windows to detect acceleration, slowdown, or volatility." right={
                <div className="flex items-center gap-2">
                  {activityGrowthRate != null && (<span className={`px-2 py-1 rounded-full text-[10px] font-black border ${activityGrowthRate >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{activityGrowthRate >= 0 ? '+' : ''}{activityGrowthRate.toFixed(1)}% growth</span>)}
                  <div className="scale-95 origin-right"><TabPill label="7d" active={weekRange === '7d'} onClick={() => setWeekRange('7d')} /><TabPill label="30d" active={weekRange === '30d'} onClick={() => setWeekRange('30d')} /><TabPill label="90d" active={weekRange === '90d'} onClick={() => setWeekRange('90d')} /></div>
                </div>
              } />
              <div className="h-[230px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekRange === '30d' && activityData.length ? activityData : chartData}>
                    <defs><linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={weekRange === '30d' && activityData.length ? 'name' : 'displayDate'} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="commits" stroke="#3b82f6" strokeWidth={2} fill="url(#colorCommits)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 gap-4">
              <KpiCard title="Total Commits" value={totalCommits} icon={<GitCommit size={20} className="text-blue-600" />} iconBg="bg-blue-50" tip="Total unique commits observed for the selected repo." />
              <KpiCard title="Open Issues" value={openIssues} icon={<AlertOctagon size={20} className="text-rose-600" />} iconBg="bg-rose-50" tip="Number of open issues. High counts may indicate backlog pressure (context matters)." />
              <KpiCard title="Active Contributors" value={activeContrib} icon={<Users size={20} className="text-purple-600" />} iconBg="bg-purple-50" tip="Contributors active in the last 30 days (bus-factor / distribution signal)." />
              <KpiCard title="Commit Streak" value={`${streak}d`} icon={<Flame size={20} className="text-orange-600" />} iconBg="bg-orange-50" tip="Consecutive days with at least one commit (requires activity today or yesterday to count)." />
            </div>
          </div>

          {/* ROW 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 items-stretch">
            <div className="lg:col-span-1"><WorkHabitsWidget data={radarData} /></div>
            <div className="lg:col-span-1"><WorkBalanceWidget weekday={(repoMetrics as any).commits?.weekdayCommits || 0} weekend={(repoMetrics as any).commits?.weekendCommits || 0} /></div>
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <SectionTitle icon={<Clock size={16} className="text-orange-500" />} title="Productivity Hours" tip="Hour-by-hour commit distribution. Helps identify peak focus windows." right={
                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                  <span>Peak: {peakHour == null ? 'N/A' : `${peakHour}:00`}</span><span className="text-slate-300">•</span>
                  <span>Merge %: {mergePct == null ? 'N/A' : `${mergePct.toFixed(2)}%`}</span><span className="text-slate-300">•</span>
                  <span>Review cov: {prReviewCoverage == null ? 'N/A' : `${prReviewCoverage.toFixed(1)}%`}</span>
                </div>
              } />
              <div className="h-[260px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commitsByHour}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>{commitsByHour.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.count > 0 ? '#fb923c' : '#fde68a'} />))}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6 items-stretch">
            <div className="lg:col-span-2"><PrStatsWidget prs={(repoMetrics as any).pullRequests} /></div>
            <div className="lg:col-span-1"><ReviewStatsWidget reviews={(repoMetrics as any).reviews} /></div>
            <div className="lg:col-span-1"><LanguageDonutWidget languages={languages} loading={loadingLanguages} /></div>
          </div>

          {/* ROW 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6 items-stretch">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full min-h-[350px] flex flex-col">
              <SectionTitle icon={<ShieldCheck size={16} className="text-teal-500" />} title="Quality Gates" tip="Actionable process quality signals. These are typically the easiest to improve via engineering practices." />
              <div className="space-y-3">
                <MetricRow label="Net Code Change" value={`${(repoMetrics as any)?.codeQuality?.netCodeChange > 0 ? '+' : ''}${(repoMetrics as any)?.codeQuality?.netCodeChange ?? 0}`} tone={(repoMetrics as any)?.codeQuality?.netCodeChange > 0 ? 'good' : 'default'} />
                <MetricRow label="Avg Commit Message Length" value={`${(repoMetrics as any)?.codeQuality?.averageCommitMessageLength ?? 0} chars`} />
                <MetricRow label="Regular Commits" value={`${((repoMetrics as any)?.codeQuality?.regularCommitPercentage ?? 0).toFixed(1)}%`} tone="info" />
                <MetricRow label="PRs without Reviews" value={prsWithoutReviewsPct == null ? 'N/A' : `${prsWithoutReviewsPct.toFixed(1)}%`} tone={prsWithoutReviewsPct != null && prsWithoutReviewsPct > 50 ? 'warn' : 'default'} />
                <MetricRow label="Largest PR Size" value={largestPrSize == null ? 'N/A' : `${Number(largestPrSize).toLocaleString()} lines`} tone={largestPrSize != null && Number(largestPrSize) > 3000 ? 'warn' : 'default'} />
              </div>
              <div className="mt-auto pt-4 border-t border-slate-100 text-[11px] text-slate-500">Tip: Reduce PR size and enforce reviews to improve gate stability.</div>
            </div>
            <TopContributorsWidget contributors={topContributors} />
            <TopReviewersWidget reviewers={topReviewers} />
            <RepoPulseWidget metrics={repoMetrics as any} />
          </div>

          {/* ROW 5: HEATMAP */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
            <SectionTitle icon={<CalendarIcon size={16} className="text-slate-500" />} title="Contribution Calendar" tip="Daily commit intensity over the last year. Useful for identifying cadence, sprint spikes, and inactive periods." />
            <div className="w-full overflow-x-auto">
              <div className="min-w-[720px]">
                <CalendarHeatmap startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))} endDate={new Date()} values={heatmapData} classForValue={(value: any) => !value || value.count === 0 ? 'color-empty' : `color-scale-${Math.min(value.count, 4)}`} showWeekdayLabels gutterSize={3} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[500px]">{loadingMetrics ? <LoadingSpinner size="lg" /> : repoError ? <div className="text-slate-500 text-sm">Failed to load repositories.</div> : <div className="text-slate-400 text-sm">Select a repository to view analytics</div>}</div>
      )}
    </div>
  );
}