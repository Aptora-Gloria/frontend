// src/entities/pull-request/index.ts

import type { PullRequestDto, PrReviewDto, PrCommitDto } from '../../shared/lib/dto/pr-dto';

// --- UI İçin Zenginleştirilmiş PullRequest Modeli ---
export interface PullRequest {
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed' | 'merged';
    author: string;
    htmlUrl: string;
    createdAt: string;

    // --- UI Hatalarını Çözen Yeni Alanlar ---
    isMerged: boolean;          // UI bunu istiyor
    closedAt: string | null;    // UI bunu istiyor
    sourceBranch: string;       // UI bunu istiyor
    targetBranch: string;       // UI bunu istiyor
    additions: number;          // UI bunu istiyor (Flattened)
    deletions: number;          // UI bunu istiyor (Flattened)
    changedFiles: number;       // UI bunu istiyor (Flattened)
}

export interface PrReview {
    id: number;
    author: string;
    state: string;
    body: string;
    date: string; // submitted_at yerine date kullanıyoruz (UI kodunda düzelteceğiz)
    htmlUrl: string;
    user?: { login: string }; // UI bazen user.login diye erişiyor
}

export interface PrCommit {
    sha: string;
    message: string;
    date: string;
    html_url: string;
    commit: {
        message: string;
        author: { name: string; date: string };
    };
    author?: { login: string; name: string };
}

// PrMetric, PullRequest'i genişletir
export interface PrMetric extends PullRequest {
    commitCount: number;
    reviewCount: number;
    commentCount: number;
    commits: PrCommit[];
    reviews: PrReview[];
    comments: any[]; // Şimdilik boş
}

// --- MAPPERS ---

export const mapPrDtoToEntity = (dto: PullRequestDto): PullRequest => {
    const isMerged = !!dto.mergedAt || (dto.state === 'closed' && !!dto.mergeCommitSha);

    let computedState: 'open' | 'closed' | 'merged' = dto.state;
    if (isMerged) computedState = 'merged';

    return {
        number: dto.prNumber,
        title: dto.title,
        body: dto.body || '',
        state: computedState,
        author: dto.authorLogin,
        htmlUrl: dto.htmlUrl,
        createdAt: dto.createdAt,

        // Eksik Alanları Dolduruyoruz
        isMerged: isMerged,
        closedAt: dto.closedAt,
        sourceBranch: 'feature-branch', // Backend DTO'da yok, placeholder
        targetBranch: 'main',           // Backend DTO'da yok, placeholder

        // İstatistikleri root seviyeye çıkarıyoruz (Flatten)
        additions: dto.changeStats?.additions || 0,
        deletions: dto.changeStats?.deletions || 0,
        changedFiles: dto.changeStats?.changedFiles || 0,
    };
};

export const mapReviewDtoToEntity = (dto: PrReviewDto): PrReview => ({
    id: dto.id,
    author: dto.reviewer.login,
    state: dto.state,
    body: dto.body || '',
    date: dto.submittedAt,
    htmlUrl: dto.htmlUrl,
    user: { login: dto.reviewer.login } // UI uyumluluğu için
});

export const mapCommitDtoToEntity = (dto: PrCommitDto): PrCommit => ({
    sha: dto.sha,
    message: dto.message,
    date: dto.committedAt,
    html_url: dto.htmlUrl,
    // UI'ın beklediği iç içe yapı
    commit: {
        message: dto.message,
        author: { name: dto.author.name || dto.author.login, date: dto.committedAt }
    },
    author: { login: dto.author.login, name: dto.author.name }
});