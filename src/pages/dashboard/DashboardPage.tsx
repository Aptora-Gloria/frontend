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

/* ---------- Types ---------- */

type CommitsPerWeekPoint = {
  w: string;
  commits: number;
};

type RepoTop = {
  name: string;
  stars: number;
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

type WeekRange = 'all' | '30d' | '90d';

/* ---------- Helpers ---------- */

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

// RepositoriesPage’deki ile uyumlu org çıkarma
function getOrgFromRepo(repo: Repo): string {
  if ((repo as any).ownerLogin) return (repo as any).ownerLogin as string;
  if (repo.fullName?.includes('/')) return repo.fullName.split('/')[0];
  return 'no-org/user-repo';
}

function getOrgLabel(repo: Repo): string {
  const org = getOrgFromRepo(repo);
  if (org === 'no-org/user-repo') return 'User repos (no organization)';
  return org;
}

// ISO hafta key’i
function getWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((Number(date) - Number(yearStart)) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNum}`;
}

// commit listesinden haftalık activity datası
function buildCommitsPerWeek(
  commits: Commit[],
  maxWeeks: number = 6,
  range: WeekRange = '30d',
): CommitsPerWeekPoint[] {
  let filtered = commits;

  if (range !== 'all') {
    const days = range === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    filtered = commits.filter((c) => {
      if (!c.committedAt) return false;
      const t = new Date(c.committedAt).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    });
  }

  const buckets = new Map<string, number>();

  filtered.forEach((c) => {
    if (!c.committedAt) return;
    const d = new Date(c.committedAt);
    if (Number.isNaN(d.getTime())) return;
    const key = getWeekKey(d);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  const sorted = Array.from(buckets.entries()).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );

  const last = sorted.slice(-maxWeeks);

  return last.map(([_, count], idx) => ({
    w: `W${idx + 1}`,
    commits: count,
  }));
}

// Repo → branch default name (RepoDetail ile aynı mantık)
function resolveDefaultBranchName(
  repo: Repo,
  branches: Branch[],
): string {
  const fromRepo = repo.defaultBranch ?? undefined;
  if (fromRepo) {
    return fromRepo;
  }

  const defaultBranch = (branches as any[]).find((b) => b.isDefault) as
    | (Branch & { isDefault?: boolean })
    | undefined;

  if (defaultBranch?.name) return defaultBranch.name;
  if (branches[0]?.name) return branches[0].name;
  return 'main';
}

/* ---------- Component ---------- */

const ORG_ALL_REPOS_VALUE = '__org__all_repos__';

export default function DashboardPage() {
  const { user } = useAuth();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [recentCommits, setRecentCommits] =
    useState<RecentCommit[]>(DEFAULT_RECENT_COMMITS);

  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);

  const [weekRange, setWeekRange] = useState<WeekRange>('30d');

  // Seçili repo objesi (sadece tek repo modunda dolu)
  const selectedRepo = useMemo(
    () => repos.find((r) => r.id === selectedRepoId) ?? null,
    [repos, selectedRepoId],
  );

  const isOrgAggregated =
    selectedOrg !== 'all' && selectedRepoId === ORG_ALL_REPOS_VALUE;

  // Org bazlı gruplama
  const groupedRepos = useMemo(
    () => {
      const map = new Map<string, Repo[]>();

      repos.forEach((r) => {
        const label = getOrgLabel(r);
        if (!map.has(label)) map.set(label, []);
        map.get(label)!.push(r);
      });

      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, list]) => [
          label,
          list.sort((x, y) =>
            (x.fullName || x.name || '').localeCompare(y.fullName || y.name || ''),
          ),
        ] as [string, Repo[]]);
    },
    [repos],
  );

  const orgOptions = useMemo(
    () => groupedRepos.map(([label]) => label),
    [groupedRepos],
  );
  useEffect(() => {
    if (selectedOrg === 'all') {
      // All orgs modunda: eğer hiç repo seçili değilse veya "org-all" seçiliyse
      // ve elimizde repo varsa, ilk repoyu seç
      if ((!selectedRepoId || selectedRepoId === ORG_ALL_REPOS_VALUE) && repos[0]) {
        setSelectedRepoId(repos[0].id);
      }
      return;
    }

    // Belirli bir organizasyon seçiliyse:
    // Şu an seçili repo bu org'a ait mi?
    const currentRepoInOrg =
      selectedRepoId &&
      selectedRepoId !== ORG_ALL_REPOS_VALUE &&
      repos.some(
        (r) => r.id === selectedRepoId && getOrgLabel(r) === selectedOrg,
      );

    // Eğer seçili repo bu org'a ait değilse, default olarak "All repos in org"
    if (!currentRepoInOrg) {
      setSelectedRepoId(ORG_ALL_REPOS_VALUE);
    }
  }, [selectedOrg, repos]); 
  /* ---------- 1) Kullanıcının tüm repo’larını çek ---------- */

  useEffect(() => {
    const fetchRepos = async () => {
      if (!user) return;

      try {
        setIsLoadingRepos(true);

        // 1) Önce DB’den oku (user + org hepsi)
        let data = await getUserRepos();

        // 2) Hiç repo yoksa bir kere init et, sonra tekrar oku
        if (data.length === 0) {
          await initUserRepos();
          data = await getUserRepos();
        }

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
  }, [user, selectedRepoId]);

  /* ---------- 2) Seçili org / repo için branch + commitleri getir ---------- */

  useEffect(() => {
    const fetchCommits = async () => {
      if (!repos.length) {
        setCommits([]);
        setRecentCommits(DEFAULT_RECENT_COMMITS);
        return;
      }

      // Hangi repolar hedef?
      let targetRepos: Repo[] = [];

      if (isOrgAggregated) {
        // Org aggregate: bu org’daki tüm repolar
        targetRepos = repos.filter((r) => getOrgLabel(r) === selectedOrg);
      } else if (selectedRepo) {
        // Tek repo modu
        targetRepos = [selectedRepo];
      } else {
        setCommits([]);
        setRecentCommits(DEFAULT_RECENT_COMMITS);
        return;
      }

      if (!targetRepos.length) {
        setCommits([]);
        setRecentCommits(DEFAULT_RECENT_COMMITS);
        return;
      }

      try {
        setIsLoadingCommits(true);

        const allCommits: Commit[] = [];
        const recentCandidates: { commit: Commit; repoFullName: string }[] = [];

        // basit olsun diye sıralı fetch (ileride Promise.all ile optimize edilebilir)
        for (const repo of targetRepos) {
          const fullName = repo.fullName;

          // 1) Branchler
          let branchEntities: Branch[] = [];
          try {
            branchEntities = await getBranchesByRepo(fullName);
          } catch (e) {
            console.warn('⚠️ getBranchesByRepo failed, trying initBranchesByRepo', e);
          }

          if (!branchEntities.length) {
            try {
              branchEntities = await initBranchesByRepo(fullName);
            } catch (e) {
              console.error('❌ initBranchesByRepo failed:', e);
            }
          }

          const branchName = resolveDefaultBranchName(repo, branchEntities);

          // 2) Commits
          let repoCommits: Commit[] = [];
          try {
            repoCommits = await queryCommits(fullName, branchName);
          } catch (e) {
            console.error('❌ queryCommits failed:', e);
          }

          if (!repoCommits.length) {
            try {
              await initCommits(fullName, branchName);
              repoCommits = await queryCommits(fullName, branchName);
            } catch (e) {
              console.error('❌ initCommits or second queryCommits failed:', e);
            }
          }

          allCommits.push(...repoCommits);
          recentCandidates.push(
            ...repoCommits.map((c) => ({ commit: c, repoFullName: fullName })),
          );
        }

        setCommits(allCommits);

        // recent commits: en yeni 20 commit, repo bilgisiyle
        recentCandidates.sort((a, b) => {
          const ta = a.commit.committedAt
            ? new Date(a.commit.committedAt).getTime()
            : 0;
          const tb = b.commit.committedAt
            ? new Date(b.commit.committedAt).getTime()
            : 0;
          return tb - ta;
        });

        const mapped = recentCandidates
          .slice(0, 20)
          .map(({ commit, repoFullName }) =>
            mapCommitToRecentCommit(commit, repoFullName),
          );

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
  }, [repos, selectedOrg, selectedRepo, isOrgAggregated]);

  /* ---------- 3) KPI’lar ---------- */

  const totalCommits = commits.length;

  const contributorIds = new Set(
    commits
      .map((c) => c.authorLogin || c.authorName)
      .filter((x): x is string => Boolean(x)),
  );
  const activeContrib = contributorIds.size;

  const avgPerContrib =
    activeContrib > 0 ? Number((totalCommits / activeContrib).toFixed(1)) : 0;

  const mostActiveRepo = isOrgAggregated
    ? selectedOrg === 'all'
      ? '-'
      : `${selectedOrg} (all repos)`
    : selectedRepo?.fullName ?? '-';

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

  /* ---------- 4) Chart dataları ---------- */

  const commitsPerWeek = useMemo(
    () => buildCommitsPerWeek(commits, 6, weekRange),
    [commits, weekRange],
  );

  const reposTop5: RepoTop[] = useMemo(() => {
    if (!repos.length) return [];
    const sorted = [...repos].sort(
      (a, b) => (b.stargazers ?? 0) - (a.stargazers ?? 0),
    );
    return sorted.slice(0, 5).map((r) => ({
      name: r.fullName || r.name,
      stars: r.stargazers ?? 0,
    }));
  }, [repos]);

  // Org aggregate modunda org toplam star/issue vs
  const orgStats = useMemo(() => {
    if (!isOrgAggregated || selectedOrg === 'all') return null;
    const orgRepos = repos.filter((r) => getOrgLabel(r) === selectedOrg);
    if (!orgRepos.length) return null;

    return {
      stars: orgRepos.reduce((acc, r) => acc + (r.stargazers ?? 0), 0),
      watchers: orgRepos.reduce((acc, r) => acc + (r.watchers ?? 0), 0),
      forks: orgRepos.reduce((acc, r) => acc + (r.forks ?? 0), 0),
      openIssues: orgRepos.reduce((acc, r) => acc + (r.openIssues ?? 0), 0),
    };
  }, [isOrgAggregated, selectedOrg, repos]);

  /* ---------- Render ---------- */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/70 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>Analytics</span>

              {/* Org selector */}
              <select
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                <option value="all">All organizations</option>
                {orgOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Repo selector */}
              <select
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                value={selectedRepoId ?? ''}
                onChange={(e) => setSelectedRepoId(e.target.value)}
              >
                {selectedOrg !== 'all' && (
                  <option value={ORG_ALL_REPOS_VALUE}>
                    All repos in {selectedOrg}
                  </option>
                )}

                {groupedRepos
                  .filter(
                    ([label]) => selectedOrg === 'all' || label === selectedOrg,
                  )
                  .map(([label, list]) => (
                    <optgroup key={label} label={label}>
                      {list.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fullName}
                        </option>
                      ))}
                    </optgroup>
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
              title={
                isOrgAggregated
                  ? 'Total Commits (organization)'
                  : 'Total Commits (selected repo)'
              }
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
              title={isOrgAggregated ? 'Scope' : 'Most Active Repository'}
              value={mostActiveRepo}
              icon={<Flame className="h-4 w-4 text-amber-500" />}
            />
          </section>

          {/* Charts row */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Trend */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-800">
                  {isOrgAggregated
                    ? 'Commits per Week (organization)'
                    : 'Commits per Week (selected repo)'}
                </h3>

                {/* Range buttons */}
                <div className="flex items-center gap-1 text-xs">
                  {(['30d', '90d', 'all'] as WeekRange[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setWeekRange(r)}
                      className={
                        'rounded-full px-2 py-1 ' +
                        (weekRange === r
                          ? 'bg-slate-900/5 text-slate-900 ring-1 ring-slate-300'
                          : 'text-slate-500 hover:bg-slate-50')
                      }
                    >
                      {r === '30d'
                        ? 'Last 30 days'
                        : r === '90d'
                          ? 'Last 90 days'
                          : 'All time'}
                    </button>
                  ))}
                </div>
              </div>

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
                      allowDecimals={false}
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

            {/* Top 5 repos by stars */}
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
                    <Bar dataKey="stars" radius={[6, 6, 6, 6]} fill="#86efac" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {reposTop5.map((r) => (
                  <li key={r.name} className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300" />
                    <span className="truncate">{r.name}</span>
                    <span className="ml-auto font-medium text-slate-700">
                      {r.stars}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Bottom: recent feed + repo/org details */}
          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <h3 className="mb-3 text-sm font-medium text-slate-800">
                {isOrgAggregated
                  ? `Recent Commits (organization: ${selectedOrg})`
                  : `Recent Commits${selectedRepo ? ` (${selectedRepo.fullName})` : ''
                  }`}
              </h3>

              {/* scrollable list */}
              <div className="max-h-80 overflow-y-auto pr-1">
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
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-slate-800">
                {isOrgAggregated ? 'Organization Details' : 'Repo Details'}
              </h3>
              <div className="space-y-2 text-sm">
                <StatusRow
                  label={isOrgAggregated ? 'Organization' : 'Name'}
                  value={
                    isOrgAggregated
                      ? selectedOrg
                      : selectedRepo?.fullName ?? '—'
                  }
                />
                <StatusRow
                  label="Language"
                  value={
                    isOrgAggregated
                      ? '—'
                      : selectedRepo?.language ?? '—'
                  }
                />
                <StatusRow
                  label="Stars"
                  value={
                    isOrgAggregated
                      ? String(orgStats?.stars ?? 0)
                      : String(selectedRepo?.stargazers ?? 0)
                  }
                />
                <StatusRow
                  label="Watchers"
                  value={
                    isOrgAggregated
                      ? String(orgStats?.watchers ?? 0)
                      : String(selectedRepo?.watchers ?? 0)
                  }
                />
                <StatusRow
                  label="Forks"
                  value={
                    isOrgAggregated
                      ? String(orgStats?.forks ?? 0)
                      : String(selectedRepo?.forks ?? 0)
                  }
                />
                <StatusRow
                  label="Open Issues"
                  value={
                    isOrgAggregated
                      ? String(orgStats?.openIssues ?? 0)
                      : String(selectedRepo?.openIssues ?? 0)
                  }
                />
                {!isOrgAggregated && (
                  <StatusRow
                    label="Default Branch"
                    value={selectedRepo?.defaultBranch ?? '—'}
                  />
                )}
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

/* ---------- Small components ---------- */

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
