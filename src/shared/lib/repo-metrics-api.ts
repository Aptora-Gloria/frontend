// src/shared/lib/repo-metrics-api.ts

import apiClient from './api-client';
import type { RepoMetricsDto } from './dto/repo-metrics-dto';

export const getRepoMetrics = async (repoFullName: string, token?: string): Promise<RepoMetricsDto> => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    const response = await apiClient.post<RepoMetricsDto>(
        '/api/metrics/repository',
        { repoFullName },
        config
    );
    return response.data;
};