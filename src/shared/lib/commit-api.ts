// src/shared/lib/commit-api.ts

import apiClient from './api-client';
import type { CommitDto } from './dto/commit-dto';
import { mapCommitDtoToEntity } from '@/entities/commit';
import type { Commit } from '@/entities/commit';

const BASE_URL = '/api/github/commits';

// fullName + branchName ile commitleri çek
export const queryCommits = async (
    fullName: string,
    branchName: string,
): Promise<Commit[]> => {
    const response = await apiClient.post<CommitDto[]>(`${BASE_URL}/query`, {
        fullName,
        branchName,
    });

    return response.data.map(mapCommitDtoToEntity);
};

// DB'de yoksa ilk init
export const initCommits = async (
    fullName: string,
    branchName: string,
): Promise<Commit[]> => {
    const response = await apiClient.post<CommitDto[]>(`${BASE_URL}/init`, {
        fullName,
        branchName,
    });

    return response.data.map(mapCommitDtoToEntity);
};
