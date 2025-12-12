// src/shared/lib/pr-api.ts
import apiClient from './api-client';
import type { PullRequestDto, PrMetricsResponseDto } from '@/shared/lib/dto/pr-dto';
import {
    mapPrDtoToEntity,
    mapPrMetricToEntity,
    type PullRequest,
    type PrMetric
} from '@/entities/pull-request';

// 1. Liste Çekme
export const queryPullRequests = async (fullName: string, state: string = ''): Promise<PullRequest[]> => {
    const params = new URLSearchParams();
    params.append('fullName', fullName);
    if (state) params.append('state', state);

    try {
        const response = await apiClient.get<PullRequestDto[]>(`/api/github/pull-requests/query?${params.toString()}`);
        return response.data.map(mapPrDtoToEntity);
    } catch (error) {
        console.error("Failed to query pull requests:", error);
        throw error; // Re-throw to let caller handle
    }
};

// 2. Init
export const initPullRequests = async (fullName: string, state: string = 'all'): Promise<PullRequest[]> => {
    const params = new URLSearchParams();
    params.append('fullName', fullName);
    params.append('state', state);
    const response = await apiClient.post<PullRequestDto[]>(`/api/github/pull-requests/init?${params.toString()}`, {});
    return response.data.map(mapPrDtoToEntity);
};

// 3. Metrik Sync
export const syncPrMetrics = async (fullName: string): Promise<PrMetric[]> => {
    const params = new URLSearchParams();
    params.append('fullName', fullName);
    const response = await apiClient.post<PrMetricsResponseDto>(
        `/api/github/pull-requests/sync-metrics?${params.toString()}`,
        {}
    );
    return response.data.pullRequests.map(mapPrMetricToEntity);
};

// --- DETAY SAYFASI İÇİN ---

export const getPrBasicInfo = async (fullName: string, prNumber: number): Promise<PullRequest | null> => {
    const allPrs = await queryPullRequests(fullName, '');
    const found = allPrs.find(pr => pr.number === prNumber);
    return found || null;
};

export const getPrMetrics = async (fullName: string, prNumber: number): Promise<PrMetric | null> => {
    const params = new URLSearchParams();
    params.append('fullName', fullName);

    try {
        const response = await apiClient.post<PrMetricsResponseDto>(
            `/api/github/pull-requests/sync-metrics?${params.toString()}`,
            {}
        );
        const foundItem = response.data.pullRequests.find(item => item.prNumber === prNumber);
        return foundItem ? mapPrMetricToEntity(foundItem) : null;
    } catch (error) {
        console.error("Failed to sync PR metrics:", error);
        throw error; // Re-throw to let caller handle
    }
};