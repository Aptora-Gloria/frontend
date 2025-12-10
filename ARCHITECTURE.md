## 1. Genel Mimari Özeti

- React + TypeScript + Vite tabanlı frontend, tüm HTTP istekleri `src/shared/lib/api-client.ts` altında tanımlanan Axios instance’ıyla yapılıyor. Bu client, geliştirme ortamında Vite proxy’sine güveniyor (boş `baseURL`), prod’da `VITE_API_URL` ortam değişkenini kullanıyor ve localStorage’dan aldığı JWT’yi `Authorization: Bearer` header’ına ekliyor.
- Domain modelleri `src/entities` altında tutuluyor (`Repo`, `Commit`, `User`). Backend’den gelen ham JSON cevapları önce `src/shared/lib/dto/*.ts` altında tanımlanmış DTO tiplerine uyduruluyor, ardından entity katmanındaki `map*DtoToEntity` fonksiyonlarıyla frontend modellerine dönüştürülüyor.
- Sayfa bileşenleri `src/pages` altında. Dashboard sayfası (`DashboardPage.tsx`) AuthContext’ten gelen kullanıcı login’ine göre repo ve commit verilerini çekiyor; Login ve Auth Callback sayfaları OAuth akışını yönetiyor.
- API katmanı: `src/shared/lib/repo-api.ts`, `commit-api.ts`, `auth-api.ts`. Her fonksiyon tek sorumluluk ilkesine göre ilgili endpoint’i çağırıyor ve dönen DTO’ları entity’lere map’liyor.
- Backend endpoint bilgisi yalnızca frontend kodundan türetildi; kökte `FRONTEND_API_ARCHITECTURE*.md` veya `GITHUB_API_ENDPOINTS*.md` dokümanları bulunmadı.

## 2. Dosya Ağacı (Kısaltılmış)

```
src/
  app/                 → App.tsx ve router entry
  entities/
    commit/index.ts    → Commit entity + mapper
    repo/index.ts      → Repo entity + mapper
    user/index.ts      → User entity
    index.ts           → Entity barrel export
  pages/
    dashboard/DashboardPage.tsx
    login/LoginPage.tsx
    auth/callback/index.tsx
    index.ts           → Page exports
  shared/
    lib/
      api-client.ts
      auth-api.ts
      repo-api.ts
      commit-api.ts
      constants.ts
      dto/
        repo-dto.ts
        commit-dto.ts
        branch-dto.ts
    contexts/AuthContext.tsx
    components/, hooks/, ui/, utils/
  widgets/             → header, repo-table vb.
```

## 3. Frontend Domain Modelleri (Entities)

### `src/entities/repo/index.ts`

```ts
export type Repo = {
  id: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  isPrivate: boolean;
  isFork: boolean;
  stargazers: number;
  watchers: number;
  forks: number;
  openIssues: number;
  size: number;
  language: string;
  defaultBranch: string;
};
```

- Kullanım: Dashboard sayfasındaki repo seçici, Repo Details paneli ve KPI’lar. `selectedRepoId` state’i `Repo.id` ile eşleşiyor.

### `src/entities/commit/index.ts`

```ts
export interface Commit {
  sha: string;
  message: string;
  authorName: string;
  authorLogin: string;
  committerName: string;
  committerLogin: string;
  authoredAt: string;
  committedAt: string;
  htmlUrl: string;
}
```

- Kullanım: Dashboard’da commit listesi, KPI hesaplamaları ve “Recent Commits” feed’i.

### `src/entities/user/index.ts`

```ts
export interface User {
  id: string;
  name: string;
  email: string;
}
```

- Kullanım: AuthContext’te temel kullanıcı bilgisi. Şu an sadece login state’ini taşımak için kullanılıyor.

## 4. DTO Tipleri (`src/shared/lib/dto`)

### `repo-dto.ts`

```ts
export interface RepoDto {
  id: string | number;
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  isPrivate: boolean;
  isFork: boolean;
  stars: number;
  watchers: number;
  forks: number;
  openIssues: number;
  size: number;
  language: string | null;
  defaultBranch?: string | null;
}
```

### `commit-dto.ts`

```ts
export interface CommitDto {
  sha: string;
  node_id: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
    committer: { name: string; email: string; date: string };
  };
  author: { login: string } | null;
  committer: { login: string } | null;
  parents: { sha: string }[];
  html_url: string;
  htmlUrl?: string | null;
  url: string;
}
```

### `branch-dto.ts`

```ts
export interface BranchDto {
  name: string;
  repo_id: number;
}
```

### `AuthResponse` / `GitHubUserDto` (`auth-api.ts`)

```ts
export interface AuthResponse { accessToken: string; }

export interface GitHubUserDto {
  id: number;
  githubUserId: number;
  login: string;
  accessToken: string;
  name: string | null;
  avatar_url: string | null;
  htmlUrl: string | null;
  ownerType: string | null;
  lastSyncedAt: string | null;
}
```

## 5. DTO → Entity Mappingleri

### `mapRepoDtoToEntity(dto: RepoDto): Repo`

```ts
export const mapRepoDtoToEntity = (dto: RepoDto): Repo => ({
  id: String(dto.id),                          // numeric id → string
  githubRepoId: dto.githubRepoId,
  name: dto.name,
  fullName: dto.fullName,
  description: dto.description ?? '',          // null-safe
  htmlUrl: dto.htmlUrl,
  isPrivate: dto.isPrivate,
  isFork: dto.isFork,
  stargazers: dto.stars,                       // backend “stars” field
  watchers: dto.watchers,
  forks: dto.forks,
  openIssues: dto.openIssues,
  size: dto.size,
  language: dto.language ?? 'Unknown',         // fallback string
  defaultBranch: dto.defaultBranch ?? 'main',  // fallback branch
});
```

### `mapCommitDtoToEntity(dto: CommitDto): Commit`

```ts
export const mapCommitDtoToEntity = (dto: CommitDto): Commit => ({
  sha: dto.sha,
  message: dto.commit.message,
  authorName: dto.commit.author?.name ?? '',
  authorLogin: dto.author?.login ?? '',
  committerName: dto.commit.committer?.name ?? '',
  committerLogin: dto.committer?.login ?? '',
  authoredAt: dto.commit.author?.date ?? '',
  committedAt: dto.commit.committer?.date ?? '',
  htmlUrl: dto.htmlUrl ?? dto.html_url ?? '',  // camel + snake destekli
});
```

## 6. API Client Fonksiyonları ve Endpoint Eşleştirmesi

| TS Fonksiyonu (Dosya) | HTTP | URL | Request Parametreleri | Response DTO → Entity | Not |
| --- | --- | --- | --- | --- | --- |
| `login(code)` (`auth-api.ts`) | POST | `/auth/login` | Body `{ code }` | `{ accessToken }` | GitHub OAuth callback kodunu backend’e gönderir. |
| `getCurrentUser()` (`auth-api.ts`) | GET | `/auth/me` | Header `Authorization` | `GitHubUserDto` | Token doğrulama + kullanıcı bilgisi. |
| `getRepositories()` (`repo-api.ts`) | GET | `/api/repos` | – | `RepoDto[]` → `Repo[]` | Tüm repos; mapping entity katmanında. |
| `getUserRepos(login)` (`repo-api.ts`) | GET | `/api/repos` | Param kullanılmıyor | `RepoDto[]` → `Repo[]` | Dashboard uyumluluğu için var; backend login’i JWT’den çıkartıyor. |
| `getCommitsByRepository(repoId)` (`commit-api.ts`) | GET | `/api/repos/${repoId}/commits` | Path `repoId` (şu an string/number) | `CommitDto[]` → `Commit[]` | Dashboard repo kimliği olarak `selectedRepo.fullName` gönderiyor (riskli). |
| `initCommitsForRepository(repoId, branchId)` (`commit-api.ts`) | POST | `/api/github/commits/init` | Body `{ repositoryId: Number(repoId), branchId: Number(branchId) }` | `CommitDto[]` → `Commit[]` | Repo/branch numeric id bekliyor; Dashboard string branch adı veriyor (bkz. Fix List). |

## 7. Backend Endpoint Özeti

> Backend dokümanı bulunamadı; aşağıdaki tablo frontend kodundan çıkarılan endpoint listesidir.

| Endpoint | Method | Parametreler | Response | Frontend Fonksiyonu |
| --- | --- | --- | --- | --- |
| `/auth/login` | POST | Body `{ code }` | `{ accessToken }` | `login` |
| `/auth/me` | GET | Header `Authorization` | `GitHubUserDto` | `getCurrentUser` |
| `/api/repos` | GET | – | `RepoDto[]` | `getRepositories` / `getUserRepos` |
| `/api/repos/{repoId}/commits` | GET | Path `repoId` | `CommitDto[]` | `getCommitsByRepository` |
| `/api/github/commits/init` | POST | Body `{ repositoryId, branchId }` | `CommitDto[]` | `initCommitsForRepository` |

## 8. Dashboard Akışı (`src/pages/dashboard/DashboardPage.tsx`)

1. `useAuth()` hook’u AuthContext’ten `user` bilgisini alır; `user.login` var ise süreç başlar.
2. `useEffect(fetchRepos)` → `getUserRepos(user.login)` çağrılır, dönen `Repo[]` `repos` state’ine yazılır. İlk repo otomatik olarak `selectedRepoId` olur (Repo.id şu an string).
3. `selectedRepo = useMemo(() => repos.find(r => r.id === selectedRepoId) ?? null)` şeklinde belirlenir.
4. `useEffect(fetchCommits)` `selectedRepo` değiştikçe tetiklenir:
   - `fullName` ve `branchName = selectedRepo.defaultBranch ?? 'main'` belirlenir.
   - `getCommitsByRepository(fullName, branchName)` çağrılır (şu an repo kimliği yerine full name kullanıyor).
   - Komit listesi boş ise `initCommitsForRepository(fullName, branchName)` çağrılarak GitHub’dan veri çekilip DB’ye yazdırılır.
   - Gelen commitler `commits` state’ine, ilk 20 tanesi `RecentCommit` formatına map’lenerek `recentCommits` state’ine yazılır; hiç veri yoksa `DEFAULT_RECENT_COMMITS` gösterilir.
5. KPI hesapları:
   - `totalCommits = commits.length`.
   - `activeContrib = unique (authorLogin || authorName)` sayısı.
   - `avgPerContrib = totalCommits / activeContrib` (1 ondalık).
   - `mostActiveRepo = selectedRepo?.fullName ?? '-'`.
   - `lastSync = commits` içindeki max `committedAt` tarihinin ISO string’i.
6. UI katmanında header’daki repo seçici, yükleme indicator’ları, KPI kartları, statik grafikler, “Recent Commits” listesi ve “Repo Details” paneli render edilir.

## 9. Tutarsızlıklar ve Olası Hatalar (Fix List)

1. **Repo kimliği uyumsuzluğu:** `getCommitsByRepository` ve `initCommitsForRepository` path/body’de repo ID (number) beklerken Dashboard `selectedRepo.fullName` string’ini gönderiyor. Entity’de `githubRepoId` bulunduğu için hem API fonksiyonlarının parametreleri hem Dashboard çağrıları bu alanı kullanacak şekilde düzeltilmeli.
2. **Branch kimliği belirsizliği:** `initCommitsForRepository` body’sinde `branchId: Number(branchId)` gönderiliyor; Dashboard ise branch adı (`defaultBranch`) kullanıyor. Backend branch’leri numerik ID üzerinden takip ediyorsa branch DTO’sunun (name + repo_id) nasıl alınacağı belirlenmeli, aksi halde `Number('main')` `NaN` üretir ve request bozulur.
3. **Dokümansız endpointler:** Backend endpoint listesi yalnızca frontend koduna dayanıyor; backend tarafında path değişiklikleri yapılırsa frontend kolayca bozulur. `FRONTEND_API_ARCHITECTURE*.md` / `GITHUB_API_ENDPOINTS*.md` gibi referans dokümanlar repo’da eksik.
4. **`getUserRepos` parametresi kullanılmıyor:** Dashboard `user.login` geçiriyor ama API fonksiyonu bunu tamamen yok sayıyor. Bu kafa karışıklığına yol açabilir; ya parametre kaldırılmalı ya da backend login’e ihtiyaç duyuyorsa doğru şekilde iletilmeli.
5. **Branch DTO kullanımı:** `src/shared/lib/dto/branch-dto.ts` tanımlı olmasına rağmen hiçbir yerde kullanılmıyor; branch seçim akışı tasarlanmamış durumda. Backend branch ID gerektiriyorsa bu DTO üzerinden branch listesi çekme ve UI’ya yansıtma planlanmalı.
6. **Fallback değerler bilinçli mi?:** Repo language `Unknown` olarak gösteriliyor; commit tarihleri yoksa boş string. UI’da bu fallback’lerin nasıl görüneceği kontrol edilmeli (ör. “Unknown” dil ve boş tarihler).
7. **Recent commits fallback:** API hatasında tek satırlık dummy commit gösteriliyor. Ürün gereksinimlerine göre kullanıcıya hata mesajı göstermek daha anlamlı olabilir.
