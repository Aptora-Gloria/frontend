// src/shared/lib/language-api.ts

import apiClient from './api-client';
import type { LanguageQueryDto, LanguageInitDto } from './dto/language-dto';
import { mapLanguageDtoToEntity, type LanguageStats } from '../../entities/language';

// Repo dil verilerini başlatır
export const initLanguages = async (repoFullName: string, token?: string): Promise<void> => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    await apiClient.post<LanguageInitDto>(
        '/api/github/languages/init',
        { repoFullName },
        config
    );
};

// Repo dil verilerini çeker (Token destekli)
export const getRepoLanguages = async (repoFullName: string, token?: string): Promise<LanguageStats> => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    // UI endpoint'ini kullanıyoruz
    const response = await apiClient.post<LanguageQueryDto>(
        '/api/github/languages/query/ui',
        { repoFullName },
        config
    );
    return mapLanguageDtoToEntity(response.data);
};