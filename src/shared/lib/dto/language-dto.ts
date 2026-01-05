// src/shared/lib/dto/language-dto.ts

export interface LanguageInitDto {
    languages: Record<string, number>;
}

export interface LanguageItemDto {
    name: string;
    bytes: number;
    percentage: number;
}

export interface LanguageQueryDto {
    languages: LanguageItemDto[];
    totalBytes: number;
}