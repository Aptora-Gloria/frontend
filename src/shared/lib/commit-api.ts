// src/shared/lib/commit-api.ts

import apiClient from './api-client';
import type { Commit } from '@/entities/commit';

export interface CommitDto {
    sha: string;
    commit: {
        message: string;
        author?: {
            name?: string | null;
            date?: string | null;
        } | null;
        committer?: {
            name?: string | null;
            date?: string | null;
        } | null;
    };
    author?: {
        login?: string | null;
    } | null;
    committer?: {
        login?: string | null;
    } | null;
    htmlUrl?: string | null;
    html_url?: string | null;
}

// DTO -> entity
export const mapCommitDtoToEntity = (dto: CommitDto): Commit => ({
    sha: dto.sha,
    message: dto.commit.message,
    authorName: dto.commit.author?.name ?? '',
    authorLogin: dto.author?.login ?? '',
    committerName: dto.commit.committer?.name ?? '',
    committerLogin: dto.committer?.login ?? '',
    authoredAt: dto.commit.author?.date ?? '',
    committedAt: dto.commit.committer?.date ?? '',
    htmlUrl: dto.htmlUrl ?? dto.html_url ?? '',
});

// DB'de olan commitleri getir
export const getCommitsByRepository = async (
    repoId: string | number,
): Promise<Commit[]> => {
    const response = await apiClient.get<CommitDto[]>(
        `/api/repos/${repoId}/commits`,
    );
    return response.data.map(mapCommitDtoToEntity);
};

// GitHub'dan çekip DB'ye init et + sonucu dön
export const initCommitsForRepository = async (
    repoId: string | number,
    branchId: string | number,
): Promise<Commit[]> => {
    const response = await apiClient.post<CommitDto[]>(
        '/api/github/commits/init',
        {
            repositoryId: Number(repoId),
            branchId: Number(branchId),
        },
    );
    return response.data.map(mapCommitDtoToEntity);
};
