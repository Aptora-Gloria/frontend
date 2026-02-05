// src/shared/lib/repo-api.ts

import apiClient from './api-client';
import type { RepoDto } from './dto/repo-dto';
import { mapRepoDtoToEntity } from '@/entities/repo';
import type { Repo } from '@/entities/repo';
import type { AppError } from '@/shared/errors';

// Kullanıcının erişebildiği tüm repos (kendi + org) – backend login'i JWT'den okuyor
export const getUserRepos = async (): Promise<Repo[]> => {
    try {
        const response = await apiClient.post<RepoDto[]>('/api/github/repos/query', {});
        return response.data.map(mapRepoDtoToEntity);
    } catch (error) {
        console.error('Failed to fetch user repositories:', error);
        throw error; // Re-throw to let caller handle
    }
};

// İlk senkronizasyon (db boşsa) – sonra tekrar getUserRepos çağrılmalı
export const initUserRepos = async (): Promise<Repo[]> => {
    try {
        const response = await apiClient.post<RepoDto[]>('/api/github/repos/init/user', {});
        return response.data.map(mapRepoDtoToEntity);
    } catch (error) {
        console.error('Failed to initialize user repositories:', error);
        throw error; // Re-throw to let caller handle
    }
};
