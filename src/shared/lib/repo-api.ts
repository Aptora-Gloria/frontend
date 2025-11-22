// src/shared/lib/repo-api.ts
import apiClient from './api-client';
import type { RepoDto } from './dto/repo-dto';
import { mapRepoDtoToEntity } from '@/entities/repo';
import type { Repo } from '@/entities/repo';

// Backend body tipi
type GetReposRequest = {
    ownerType?: 'USER' | 'ORGANIZATION';
    ownerLogin?: string;
};

/**
 * JWT’deki kullanıcı için repos/query çağrısı.
 * Parametre vermezsen: USER + ORGANIZATION hepsi gelir.
 * İstersen filtre için opsiyonel body geçebilirsin.
 */
export const getUserRepos = async (
    body?: GetReposRequest,
): Promise<Repo[]> => {
    const response = await apiClient.post<RepoDto[]>(
        '/api/github/repos/query',
        body ?? {},        // default: tüm ownerType’lar
    );

    return response.data.map(mapRepoDtoToEntity);
};

/**
 * Kullanıcının GitHub’daki tüm reposunu (user + org) DB’ye senkron eder.
 * Endpoint body beklemiyor, o yüzden parametre yok.
 */
export const initUserRepos = async (): Promise<void> => {
    await apiClient.post('/api/github/repos/init/user');
};
