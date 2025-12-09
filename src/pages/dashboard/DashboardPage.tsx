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
  Line,
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
import type { Branch } from '@/entities/branch';

/* UI COMPONENTS */
import { Dropdown } from '@/shared/ui/dropdown';
import { TabPill } from '@/shared/ui/tab';
import { Avatar } from '@/shared/ui/avatar';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';

/* ---------- Types ---------- */

type CommitsPerWeekPoint = { w: string; commits: number };
type RepoTop = { name: string; stars: number };
type RecentCommit = { repo: string; author: string; msg: string; time: string };
type KpiCardProps = { title: string; value: string; icon: ReactNode };
type StatusRowProps = { label: string; value: string };
type WeekRange = 'all' | '30d' | '90d';

/* ---------- Helpers ---------- */

const DEFAULT_RECENT_COMMITS: RecentCommit[] = [
  { repo: 'demo/backend', author: 'system', msg: 'no data yet', time: '' },
];

function mapCommit(c: Commit, repo: string): RecentCommit {
  return {
    repo,
    author: c.authorLogin || c.authorName || 'unknown',
    msg: c.message,
    time: c.committedAt ? new Date(c.committedAt).toLocaleString() : '',
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

function getWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNum}`;
}

function buildCommitsPerWeek(
  commits: Commit[],
  maxWeeks: number,
  range: WeekRange,
): CommitsPerWeekPoint[] {
  let filtered = commits;

  if (range !== 'all') {
    const days = range === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    filtered = commits.filter((c) => {
      if (!c.committedAt) return false;
      const t = new Date(c.committedAt).getTime();
      return t >= cutoff;
    });
  }

  const map = new Map<string, number>();
  for (const c of filtered) {
    if (!c.committedAt) continue;
    const key = getWeekKey(new Date(c.committedAt));
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-maxWeeks)
    .map(([_, count], i) => ({ w: `W${i + 1}`, commits: count }));
}

function resolveDefaultBranch(repo: Repo, branches: Branch[]) {
  return (
    repo.defaultBranch ||
    (branches.find((b: any) => b.isDefault)?.name ?? branches[0]?.name ?? 'main')
  );
}

/* ---------- Main Component ---------- */

const ORG_ALL = '__all_repos';

export default function DashboardPage() {
  const { user } = useAuth();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('all');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [recent, setRecent] = useState<RecentCommit[]>(DEFAULT_RECENT_COMMITS);

  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);

  const [weekRange, setWeekRange] = useState<WeekRange>('30d');

  /* ---------- Load repos ---------- */

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        setLoadingRepos(true);
        let data = await getUserRepos();
        if (!data.length) {
          await initUserRepos();
          data = await getUserRepos();
        }
        setRepos(data);
        if (!selectedRepoId && data[0]) setSelectedRepoId(data[0].id);
      } finally {
        setLoadingRepos(false);
      }
    };
    run();
  }, [user]);

  /* ---------- Group by org ---------- */

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

  const selectedRepo = useMemo(
    () => repos.find((r) => r.id === selectedRepoId) ?? null,
    [repos, selectedRepoId],
  );

  const isOrgAggregated = selectedOrg !== 'all' && selectedRepoId === ORG_ALL;

  /* ---------- Load commits based on org/repo ---------- */

  useEffect(() => {
    const run = async () => {
      if (!repos.length) return;

      let target: Repo[] = [];

      if (isOrgAggregated) {
        target = repos.filter((r) => getOrgLabel(r) === selectedOrg);
      } else if (selectedRepo) {
        target = [selectedRepo];
      } else return;

      try {
        setLoadingCommits(true);

        const all: Commit[] = [];
        const recents: RecentCommit[] = [];

        for (const r of target) {
          const fullName = r.fullName;

          let branches = await getBranchesByRepo(fullName).catch(() => []);
          if (!branches.length) {
            branches = await initBranchesByRepo(fullName).catch(() => []);
          }

          // tüm branchlerdeki commitleri toplayacağız
          const branchNames = branches.map((b) => b.name);
          const repoAllCommits: Commit[] = [];

          for (const br of branchNames) {
            let cList = await queryCommits(fullName, br).catch(() => []);

            if (!cList.length) {
              await initCommits(fullName, br);
              cList = await queryCommits(fullName, br).catch(() => []);
            }

            // tüm branch commitlerini ekle
            repoAllCommits.push(...cList);
          }

          // Hiçbir şey filtrelemiyoruz → tüm branchlerden tüm commitler
          all.push(...repoAllCommits);

          // Recent list için sadece en yeni 20 tanesini seçiyoruz
          recents.push(...repoAllCommits.map((c) => mapCommit(c, fullName)));
        }

        setCommits(all);

        recents.sort(
          (a, b) =>
            new Date(b.time).getTime() - new Date(a.time).getTime(),
        );

        setRecent(recents.slice(0, 20));
      } finally {
        setLoadingCommits(false);
      }
    };

    run();
  }, [repos, selectedOrg, selectedRepoId]);

  /* ---------- KPI ---------- */

  const total = commits.length;
  const contrib = new Set(
    commits
      .map((c) => c.authorLogin || c.authorName)
      .filter((x): x is string => Boolean(x)),
  ).size;

  const avg = contrib ? (total / contrib).toFixed(1) : '0';
  const mostActive = isOrgAggregated
    ? `${selectedOrg} (all repos)`
    : selectedRepo?.fullName ?? '-';

  const lastSync = commits.length
    ? new Date(
      Math.max(
        ...commits.map((c) =>
          c.committedAt ? new Date(c.committedAt).getTime() : 0,
        ),
      ),
    ).toISOString()
    : '-';

  const commitsPerWeek = useMemo(
    () => buildCommitsPerWeek(commits, 6, weekRange),
    [commits, weekRange],
  );

  const topStars = useMemo(() => {
    const sorted = [...repos].sort(
      (a, b) => (b.stargazers ?? 0) - (a.stargazers ?? 0),
    );
    return sorted.slice(0, 5).map((r) => ({
      name: r.fullName || r.name,
      stars: r.stargazers ?? 0,
    }));
  }, [repos]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-17 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3 text-sm text-slate-600">

            {/* ORG DROPDOWN */}
            <Dropdown
              label="Organizations"
              items={[
                { label: 'All organizations', value: 'all' },
                ...orgOptions,
              ]}
              value={selectedOrg}
              onChange={setSelectedOrg}
            />

            {/* REPO DROPDOWN */}
            <Dropdown
              label="Repositories"
              items={
                selectedOrg === 'all'
                  ? repos.map((r) => ({
                    label: r.fullName,
                    value: r.id,
                  }))
                  : [
                    { label: `All repos in ${selectedOrg}`, value: ORG_ALL },
                    ...repos
                      .filter((r) => getOrgLabel(r) === selectedOrg)
                      .map((r) => ({
                        label: r.fullName,
                        value: r.id,
                      })),
                  ]
              }
              value={selectedRepoId ?? ''}
              onChange={setSelectedRepoId}
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            {loadingRepos && <LoadingSpinner size="sm" />}
            {loadingCommits && <LoadingSpinner size="sm" />}
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Last Sync: {lastSync}</span>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* KPI */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Commits"
            value={String(total)}
            icon={<Activity className="h-4 w-4 text-sky-500" />}
          />
          <KpiCard
            title="Active Contributors"
            value={String(contrib)}
            icon={<Users className="h-4 w-4 text-emerald-500" />}
          />
          <KpiCard
            title="Avg Commits / Contributor"
            value={String(avg)}
            icon={<GitBranch className="h-4 w-4 text-violet-500" />}
          />
          <KpiCard
            title="Most Active Repository"
            value={mostActive}
            icon={<Flame className="h-4 w-4 text-amber-500" />}
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Trend */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-800">
                Commits per Week
              </h3>

              <div className="flex items-center gap-2">
                <TabPill
                  label="Last 30 days"
                  active={weekRange === '30d'}
                  onClick={() => setWeekRange('30d')}
                />
                <TabPill
                  label="Last 90 days"
                  active={weekRange === '90d'}
                  onClick={() => setWeekRange('90d')}
                />
                <TabPill
                  label="All time"
                  active={weekRange === 'all'}
                  onClick={() => setWeekRange('all')}
                />
              </div>
            </div>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={commitsPerWeek}>
                  <CartesianGrid stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="w" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="commits"
                    fill="#bae6fd"
                    stroke="#60a5fa"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="commits"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top stars */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-medium text-slate-800">
              Top 5 Repositories by Stars
            </h3>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topStars}
                  layout="vertical"
                  margin={{ left: 10, right: 10, top: 10 }}
                >
                  <CartesianGrid stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="stars" fill="#86efac" radius={[6, 6, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Bottom section */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent commits */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h3 className="mb-3 text-sm font-medium text-slate-800">
              Recent Commits
            </h3>

            <div className="max-h-80 overflow-y-auto pr-1">
              <ul className="divide-y divide-slate-200">
                {recent.map((c, i) => (
                  <li key={`${c.repo}-${i}`} className="flex items-center gap-3 py-3">
                    <Avatar name={c.author} size="md" />
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
          </div>

          {/* Repo details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-medium text-slate-800">
              Repo Details
            </h3>

            <StatusRow label="Name" value={selectedRepo?.fullName ?? '-'} />
            <StatusRow label="Language" value={selectedRepo?.language ?? '-'} />
            <StatusRow
              label="Stars"
              value={String(selectedRepo?.stargazers ?? 0)}
            />
            <StatusRow
              label="Watchers"
              value={String(selectedRepo?.watchers ?? 0)}
            />
            <StatusRow label="Forks" value={String(selectedRepo?.forks ?? 0)} />
            <StatusRow
              label="Open Issues"
              value={String(selectedRepo?.openIssues ?? 0)}
            />
            <StatusRow
              label="Default Branch"
              value={selectedRepo?.defaultBranch ?? '-'}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

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
