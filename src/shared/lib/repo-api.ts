// src/shared/lib/repo-api.ts
import type { AxiosResponse } from 'axios';
import apiClient from './api-client';
import { mapRepoDtoToEntity, type RepoDto } from './dto/repo-dto';
import type { Repo } from '@/entities/repo';

/**
 * Tüm repoları getirir
 * GET /api/repos
 */
export const getRepositories = async (): Promise<Repo[]> => {
    const response: AxiosResponse<RepoDto[]> = await apiClient.get('/api/repos');
    return response.data.map(mapRepoDtoToEntity);
};

/**
 * Eski isim ile uyumluluk için:
 * DashboardPage şu an getUserRepos(login) çağırıyor.
 * Backend login'i JWT'den aldığı için login parametresini kullanmıyoruz.
 */
export const getUserRepos = async (_login: string): Promise<Repo[]> => {
    return getRepositories();
};
