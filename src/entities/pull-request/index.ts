// src/entities/pull-request/index.ts

import type {
    PullRequestDto,
    PrMetricItemDto,
    PrCommitDto,
    PrReviewDto,
    PrCommentDto
} from '@/shared/lib/dto/pr-dto';

// --- 1. Basic Entity ---
export interface PullRequest {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    isMerged: boolean;
    author: string;
    htmlUrl: string;
    sourceBranch: string;
    targetBranch: string;
    createdAt: string;
    closedAt: string | null;
    // YENİ EKLENEN ALANLAR (İstatistikler)
    additions: number | null;
    deletions: number | null;
    changedFiles: number | null;
}

// --- 2. Metric Entity ---
export interface PrMetric {
    prNumber: number;
    commitCount: number;
    reviewCount: number;
    commentCount: number;
    commits: PrCommitDto[];
    reviews: PrReviewDto[];
    comments: PrCommentDto[];
}

// --- Mappers ---

export function mapPrDtoToEntity(dto: PullRequestDto): PullRequest {
    return {
        id: dto.id,
        number: dto.number,
        title: dto.title,
        body: dto.body,
        state: dto.state,
        isMerged: dto.merged,
        author: dto.user?.login || 'Unknown',
        htmlUrl: dto.html_url,
        sourceBranch: dto.head.ref,
        targetBranch: dto.base.ref,
        createdAt: dto.created_at,
        closedAt: dto.closed_at,
        // YENİ ALANLARI EŞLİYORUZ
        // Not: Backend bunları bazen null gönderebilir, güvenli olsun diye "??" kullanabilirsin ama DTO'da null tanımlı zaten.
        additions: (dto as any).additions,
        deletions: (dto as any).deletions,
        changedFiles: (dto as any).changed_files
    };
}

export function mapPrMetricToEntity(dto: PrMetricItemDto): PrMetric {
    return {
        prNumber: dto.prNumber,
        commitCount: dto.commitCount,
        reviewCount: dto.reviewCount,
        commentCount: dto.commentCount,
        commits: dto.commits || [],
        reviews: dto.reviews || [],
        comments: dto.comments || []
    };
}