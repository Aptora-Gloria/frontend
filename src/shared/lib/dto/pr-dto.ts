// src/shared/lib/dto/pr-dto.ts

export interface PullRequestDto {
    id: number;
    githubPrId: number;
    prNumber: number;
    repoFullName: string;
    dataLevel: 'BASIC' | 'FULL';
    state: 'open' | 'closed';
    draft: boolean;
    title: string;
    body: string | null;
    authorLogin: string;
    authorGithubId: number;
    htmlUrl: string;
    mergeCommitSha: string | null;
    changeStats: {
        additions: number;
        deletions: number;
        changedFiles: number;
        available: boolean;
        syncedAt: string;
    };
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    lastSyncedAt: string;
}

export interface PrReviewDto {
    id: number;
    githubReviewId: number;
    pullRequestId: number;
    reviewer: { login: string; githubId: number };
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
    body: string | null;
    submittedAt: string;
    htmlUrl: string;
}

export interface PrCommitDto {
    id: number;
    githubRepoId: number;
    sha: string;
    pullRequestId: number;
    message: string;
    author: { login: string; name: string; email: string };
    committedAt: string;
    htmlUrl: string;
}

export interface SyncStatusDto {
    repoFullName: string;
    overallStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    // Diğer alanlar opsiyonel
}