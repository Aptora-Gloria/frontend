// src/shared/lib/repo-api.ts

import apiClient from './api-client';
import type { RepoDto } from './dto/repo-dto';
import { mapRepoDtoToEntity } from '@/entities/repo';
import type { Repo } from '@/entities/repo';

// Kullanıcının reposunu getirir (backend login'i JWT'den okuyor)
export const getUserRepos = async (_login: string): Promise<Repo[]> => {
    const response = await apiClient.post<RepoDto[]>('/api/github/repos/query', {
        // şimdilik body boş, backend login'i token'dan alıyor
    });

    return response.data.map(mapRepoDtoToEntity);
};
