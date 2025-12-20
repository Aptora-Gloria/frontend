// src/shared/lib/pr-api.ts

import apiClient from './api-client';
import type { PullRequestDto, PrReviewDto, PrCommitDto, SyncStatusDto } from './dto/pr-dto';
import { mapPrDtoToEntity, mapReviewDtoToEntity, mapCommitDtoToEntity } from '../../entities/pull-request';
import type { PullRequest, PrReview, PrCommit, PrMetric } from '../../entities/pull-request';

// --- Internal Fetchers ---

const fetchPrDetailInternal = async (repoFullName: string, prNumber: number): Promise<PullRequest> => {
    const response = await apiClient.post<PullRequestDto>('/api/github/pull-requests/query/single', {
        repoFullName,
        prNumber
    });
    return mapPrDtoToEntity(response.data);
};

const fetchPrReviewsInternal = async (repoFullName: string, prNumber: number): Promise<PrReview[]> => {
    const response = await apiClient.post<PrReviewDto[]>('/api/github/pull-requests/reviews', {
        repoFullName,
        prNumber
    });
    return response.data.map(mapReviewDtoToEntity);
};

const fetchPrCommitsInternal = async (repoFullName: string, prNumber: number): Promise<PrCommit[]> => {
    const response = await apiClient.post<PrCommitDto[]>('/api/github/pull-requests/commits', {
        repoFullName,
        prNumber
    });
    return response.data.map(mapCommitDtoToEntity);
};

// --- EXPORTS ---

export const getPrBasicInfo = async (repoFullName: string, prNumber: number): Promise<PullRequest> => {
    return fetchPrDetailInternal(repoFullName, prNumber);
};

export const getPrMetrics = async (repoFullName: string, prNumber: number): Promise<PrMetric> => {
    // Hepsini paralel çekiyoruz
    const [pr, reviews, commits] = await Promise.all([
        fetchPrDetailInternal(repoFullName, prNumber),
        fetchPrReviewsInternal(repoFullName, prNumber),
        fetchPrCommitsInternal(repoFullName, prNumber)
    ]);

    return {
        ...pr,
        commitCount: commits.length,
        reviewCount: reviews.length,
        commentCount: 0,
        commits: commits,
        reviews: reviews,
        comments: []
    };
};

// Sync fonksiyonları
export const startPrSync = async (repoFullName: string): Promise<void> => {
    await apiClient.post('/api/github/pull-requests/sync/initiate', { repoFullName });
};

export const getSyncStatus = async (repoFullName: string): Promise<SyncStatusDto> => {
    const response = await apiClient.post<SyncStatusDto>('/api/github/pull-requests/sync/status', { repoFullName });
    return response.data;
};

export const queryPullRequests = async (repoFullName: string): Promise<PullRequest[]> => {
    // Listeyi çeken endpoint'e istek atıyoruz
    const response = await apiClient.post<PullRequestDto[]>('/api/github/pull-requests/query', {
        repoFullName
    });
    // Gelen veriyi entity formatına çevirip döndürüyoruz
    return response.data.map(mapPrDtoToEntity);
}

export const initPullRequests = startPrSync;