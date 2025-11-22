import type { RepoDto } from '@shared/lib/dto/repo-dto';

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
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    ownerLogin: string;
    ownerType: string;
    lastSyncedAt: string | null;
};

export const mapRepoDtoToEntity = (dto: RepoDto): Repo => ({
    id: String(dto.id),
    githubRepoId: dto.githubRepoId,
    name: dto.name,
    fullName: dto.fullName,
    description: dto.description ?? '',
    htmlUrl: dto.htmlUrl,
    isPrivate: dto.isPrivate,
    isFork: dto.isFork,
    stargazers: dto.stargazersCount,
    watchers: dto.watchersCount,
    forks: dto.forksCount,
    openIssues: dto.openIssuesCount,
    size: dto.size,
    language: dto.language ?? 'Unknown',
    defaultBranch: dto.defaultBranch ?? 'main',
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    pushedAt: dto.pushedAt,
    ownerLogin: dto.ownerLogin,
    ownerType: dto.ownerType,
    lastSyncedAt: dto.lastSyncedAt ?? null
});
