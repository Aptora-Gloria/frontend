// src/entities/repo/index.ts

import type { RepoDto } from '@/shared/lib/dto/repo-dto';

export interface Repo {
    id: string;
    githubId: number;

    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;

    isPrivate: boolean;
    isFork: boolean;

    stargazers: number;
    watchers: number;
    forks: number;
    openIssues: number;
    size: number;

    language: string | null;
    defaultBranch: string | null;

    createdAt: string | null;
    updatedAt: string | null;
    pushedAt: string | null;

    ownerLogin: string | null;
    ownerType: string | null;

    lastSyncedAt: string | null;
}

export const mapRepoDtoToEntity = (dto: RepoDto): Repo => ({
    id: String(dto.id),
    githubId: dto.githubRepoId,

    name: dto.name,
    fullName: dto.fullName,
    description: dto.description ?? null,
    htmlUrl: dto.htmlUrl,

    isPrivate: dto.isPrivate,
    isFork: dto.isFork,

    stargazers: dto.stargazersCount,
    watchers: dto.watchersCount,
    forks: dto.forksCount,
    openIssues: dto.openIssuesCount,
    size: dto.size,

    language: dto.language ?? null,
    defaultBranch: dto.defaultBranch ?? null,

    createdAt: dto.createdAt ?? null,
    updatedAt: dto.updatedAt ?? null,
    pushedAt: dto.pushedAt ?? null,

    ownerLogin: dto.ownerLogin ?? null,
    ownerType: dto.ownerType ?? null,

    lastSyncedAt: dto.lastSyncedAt ?? null,
});
