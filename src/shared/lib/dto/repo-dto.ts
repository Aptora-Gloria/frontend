// src/shared / lib / dto / repo - dto.ts

import type { Repo } from '@/entities/repo';
import { number } from 'framer-motion';

export interface RepoDto {
    id: string;
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
}

export const mapRepoDtoToEntity = (dto: RepoDto): Repo => ({
    id: Number(dto.id),
    githubId: dto.githubRepoId,
    name: dto.name,
    fullName: dto.fullName,
    description: dto.description ?? '',
    htmlUrl: dto.htmlUrl,
    isPrivate: dto.isPrivate,
    isFork: dto.isFork,
    stargazersCount: dto.stars,
    watchersCount: dto.watchers,
    forksCount: dto.forks,
    openIssuesCount: dto.openIssues,
    size: dto.size,
    language: dto.language ?? '',
    defaultBranch: 'main', // backend verince değiştirirsin
});