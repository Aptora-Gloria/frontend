// src/shared/lib/user-performance-api.ts

import apiClient from './api-client';
import type { UserMetricsDto } from './dto/user-metrics-dto';

export const fetchUserMetrics = async (login: string, token?: string): Promise<UserMetricsDto> => {
    const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

    const response = await apiClient.post<UserMetricsDto>(
        '/api/metrics/user',
        { login },
        config
    );
    return response.data;
};