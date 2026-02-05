// src/entities/language/index.ts

import type { LanguageQueryDto } from '../../shared/lib/dto/language-dto';

// --- UI Entity ---
export interface RepoLanguage {
    name: string;
    bytes: number;
    percentage: number;
    // İleride renk (color) ataması gerekirse buraya eklenebilir
}

export interface LanguageStats {
    items: RepoLanguage[];
    totalBytes: number;
}

// --- Mapper ---
export const mapLanguageDtoToEntity = (dto: LanguageQueryDto): LanguageStats => {
    return {
        items: dto.languages.map(lang => ({
            name: lang.name,
            bytes: lang.bytes,
            percentage: lang.percentage
        })),
        totalBytes: dto.totalBytes
    };
};