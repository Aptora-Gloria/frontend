// src/pages/dashboard/DashboardPage.tsx
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GitBranch,
  Users,
  Activity,
  Flame,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { useAuth } from '@/shared/contexts/AuthContext';
import { getUserRepos } from '@/shared/lib/repo-api';
import { queryCommits } from '@/shared/lib/commit-api';

import type { Repo } from '@/entities/repo';
import type { Commit } from '@/entities/commit';

type CommitsPerWeekPoint = {
  w: string;
  commits: number;
};

type RepoTop = {
  name: string;
  commits: number;
};

type RecentCommit = {
  repo: string;
  author: string;
  msg: string;
  time: string;
};

type KpiCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
};

type StatusRowProps = {
  label: string;
  value: string;
};

// --- Şimdilik statik metric verileri (backend metrics endpoint gelince değişir) ---
const commitsPerWeek: CommitsPerWeekPoint[] = [
  { w: 'W1', commits: 92 },
  { w: 'W2', commits: 104 },
  { w: 'W3', commits: 126 },
  { w: 'W4', commits: 138 },
  { w: 'W5', commits: 172 },
  { w: 'W6', commits: 165 },
];

const reposTop5: RepoTop[] = [
  { name: 'Aptora-Gloria/backend', commits: 74 },
  { name: 'Aptora-Gloria/frontend', commits: 51 },
  { name: 'Aptora-Gloria/dia_fiyat_gor', commits: 29 },
  { name: 'Aptora-Gloria/oguzhan_workspace', commits: 23 },
  { name: 'Aptora-Gloria/etl-tools', commits: 18 },
];

// Fallback dummy commits (API error durumunda)
const DEFAULT_RECENT_COMMITS: RecentCommit[] = [
  {
    repo: 'demo/backend',
    author: 'system',
    msg: 'no data yet',
    time: '',
  },
];

const mapCommitToRecentCommit = (
  c: Commit,
  repoFullName: string,
): RecentCommit => ({
  repo: repoFullName,
  author: c.authorLogin || c.authorName || 'unknown',
  msg: c.message,
  time: c.committedAt
    ? new Date(c.committedAt).toLocaleString()
    : 'unknown time',
});

export default function DashboardPage() {
  const { user } = useAuth();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [recentCommits, setRecentCommits] =
    useState<RecentCommit[]>(DEFAULT_RECENT_COMMITS);

  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);

  // Seçili repo objesi
  const selectedRepo = useMemo(
    () => repos.find((r) => r.id === selectedRepoId) ?? null,
    [repos, selectedRepoId],
  );

  // --- 1) Kullanıcının reposunu çek ---
  useEffect(() => {
    const fetchRepos = async () => {
      if (!user?.login) return;

      try {
        setIsLoadingRepos(true);
        const data = await getUserRepos(user.login);
        setRepos(data);

        if (data.length > 0 && !selectedRepoId) {
          setSelectedRepoId(data[0].id);
        }
      } catch (error) {
        console.error('❌ Failed to load repos:', error);
      } finally {
        setIsLoadingRepos(false);
      }
    };

    fetchRepos();
  }, [user?.login, selectedRepoId]);

  // --- 2) Seçili repo için commitleri getir ---
  useEffect(() => {
    const fetchCommits = async () => {
      if (!selectedRepo) {
        setCommits([]);
        setRecentCommits(DEFAULT_RECENT_COMMITS);
        return;
      }

      try {
        setIsLoadingCommits(true);

        const fullName = selectedRepo.fullName;
        const branchName = selectedRepo.defaultBranch || 'main';

        // ⬇⬇⬇ ÖNEMLİ DEĞİŞİKLİK: obje yerine iki string parametre
        const repoCommits = await queryCommits(fullName, branchName);
        // ⬆⬆⬆

        setCommits(repoCommits);

        const mapped = repoCommits
          .slice(0, 20)
          .map((c) => mapCommitToRecentCommit(c, fullName));
        setRecentCommits(mapped.length ? mapped : DEFAULT_RECENT_COMMITS);
      } catch (error) {
        console.error('❌ Failed to load commits:', error);
        setCommits([]);
        setRecentCommits(DEFAULT_RECENT_COMMITS);
      } finally {
        setIsLoadingCommits(false);
      }
    };

    fetchCommits();
  }, [selectedRepo]);

  // --- 3) KPI’lar (şimdilik commit listesinden hesaplanıyor) ---
  const totalCommits = commits.length;

  const contributorIds = new Set(
    commits
      .map((c) => c.authorLogin || c.authorName)
      .filter((x): x is string => Boolean(x)),
  );
  const activeContrib = contributorIds.size;

  const avgPerContrib =
    activeContrib > 0 ? Number((totalCommits / activeContrib).toFixed(1)) : 0;

  const mostActiveRepo = selectedRepo?.fullName ?? '-';

  const lastSync =
    commits.length
      ? new Date(
        Math.max(
          ...commits.map((c) =>
            c.committedAt ? new Date(c.committedAt).getTime() : 0,
          ),
        ),
      ).toISOString()
      : '-';

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/70 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Analytics</span>

              {/* Repo selector */}
              <select
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                value={selectedRepoId ?? ''}
                onChange={(e) => setSelectedRepoId(e.target.value)}
              >
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              {isLoadingRepos && (
                <span className="animate-pulse text-slate-400">
                  Loading repos…
                </span>
              )}
              {isLoadingCommits && (
                <span className="animate-pulse text-slate-400">
                  Loading commits…
                </span>
              )}
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Last Sync: {lastSync}</span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* KPI row */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Commits (selected repo)"
              value={totalCommits.toString()}
              icon={<Activity className="h-4 w-4 text-sky-500" />}
            />
            <KpiCard
              title="Active Contributors"
              value={activeContrib.toString()}
              icon={<Users className="h-4 w-4 text-emerald-500" />}
            />
            <KpiCard
              title="Avg Commits / Contributor"
              value={avgPerContrib.toString()}
              icon={<GitBranch className="h-4 w-4 text-violet-500" />}
            />
            <KpiCard
              title="Most Active Repository"
              value={mostActiveRepo}
              icon={<Flame className="h-4 w-4 text-amber-500" />}
            />
          </section>

          {/* Charts row */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Trend (statik) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <h3 className="mb-3 text-sm font-medium text-slate-800">
                Commits per Week (Organization)
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={commitsPerWeek}>
                    <CartesianGrid stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="w"
                      tickLine={false}
                      axisLine={false}
                      stroke="#94A3B8"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke="#94A3B8"
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="commits"
                      stroke="#60a5fa"
                      fill="#bae6fd"
                      strokeWidth={2.2}
                      fillOpacity={0.6}
                    />
                    <Line
                      type="monotone"
                      dataKey="commits"
                      stroke="#3b82f6"
                      strokeWidth={1.6}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 repos (statik) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-slate-800">
                Top 5 Repositories by Stars
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reposTop5}
                    margin={{ left: 10, right: 10, top: 10, bottom: 0 }}
                    layout="vertical"
                  >
                    <CartesianGrid stroke="#E5E7EB" horizontal={false} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      stroke="#94A3B8"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      stroke="#64748B"
                      width={200}
                    />
                    <Tooltip />
                    <Bar dataKey="commits" radius={[6, 6, 6, 6]} fill="#86efac" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {reposTop5.map((r) => (
                  <li key={r.name} className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300" />
                    <span className="truncate">{r.name}</span>
                    <span className="ml-auto font-medium text-slate-700">
                      {r.commits}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Bottom: recent feed + repo details */}
          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <h3 className="mb-3 text-sm font-medium text-slate-800">
                Recent Commits
                {selectedRepo ? ` (${selectedRepo.fullName})` : ''}
              </h3>
              <ul className="divide-y divide-slate-200">
                {recentCommits.map((c, i) => (
                  <li
                    key={`${c.repo}-${i}`}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {c.msg}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {c.author} • {c.repo}
                      </div>
                    </div>
                    <div className="ml-auto shrink-0 text-xs text-slate-500">
                      {c.time}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-slate-800">
                Repo Details
              </h3>
              <div className="space-y-2 text-sm">
                <StatusRow
                  label="Name"
                  value={selectedRepo?.fullName ?? '—'}
                />
                <StatusRow
                  label="Language"
                  value={selectedRepo?.language ?? '—'}
                />
                <StatusRow
                  label="Stars"
                  value={String(selectedRepo?.stargazers ?? 0)}
                />
                <StatusRow
                  label="Watchers"
                  value={String(selectedRepo?.watchers ?? 0)}
                />
                <StatusRow
                  label="Forks"
                  value={String(selectedRepo?.forks ?? 0)}
                />
                <StatusRow
                  label="Open Issues"
                  value={String(selectedRepo?.openIssues ?? 0)}
                />
                <StatusRow
                  label="Default Branch"
                  value={selectedRepo?.defaultBranch ?? '—'}
                />
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-10 border-t border-slate-200 bg-white/70 py-3 text-center text-xs text-slate-500 backdrop-blur">
          footer placeholder
        </footer>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>{title}</span>
        {icon}
      </div>
      <div className="truncate text-2xl font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function StatusRow({ label, value }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
