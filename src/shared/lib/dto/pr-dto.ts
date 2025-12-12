// src/shared/lib/dto/pr-dto.ts

// 1. Liste Sorgusu (/query)
export interface PullRequestDto {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    merged: boolean;
    html_url: string;
    user: { id: number; login: string };
    head: { ref: string; sha: string };
    base: { ref: string; sha: string };
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
}

// 2. Metrik Detayları (/sync-metrics)

export interface PrCommitDto {
    sha: string;
    commit: {
        message: string;
        author: { name: string; date: string };
    };
    author: { login: string } | null;
    html_url: string;
}

export interface PrReviewDto {
    id: number;
    state: string;
    body: string;
    submitted_at: string;
    user: { login: string };
}

export interface PrCommentDto {
    id: number;
    body: string;
    created_at: string;
    user: { login: string };
}

export interface PrMetricItemDto {
    prNumber: number;
    prTitle: string;
    prState: string;
    commitCount: number;
    reviewCount: number;
    commentCount: number;
    commits: PrCommitDto[];
    reviews: PrReviewDto[];
    comments: PrCommentDto[];
}

export interface PrMetricsResponseDto {
    repositoryFullName: string;
    totalPullRequests: number;
    pullRequests: PrMetricItemDto[];
}