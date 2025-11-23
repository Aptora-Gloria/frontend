// src/shared/lib/repo-api.ts

import apiClient from './api-client';
import type { RepoDto } from './dto/repo-dto';
import { mapRepoDtoToEntity } from '@/entities/repo';
import type { Repo } from '@/entities/repo';

// Kullanıcının erişebildiği tüm repos (kendi + org) – backend login'i JWT'den okuyor
export const getUserRepos = async (): Promise<Repo[]> => {
    const response = await apiClient.post<RepoDto[]>('/api/github/repos/query', {});
    return response.data.map(mapRepoDtoToEntity);
};

// İlk senkronizasyon (db boşsa) – sonra tekrar getUserRepos çağrılmalı
export const initUserRepos = async (): Promise<Repo[]> => {
    const response = await apiClient.post<RepoDto[]>('/api/github/repos/init', {});
    return response.data.map(mapRepoDtoToEntity);
};
