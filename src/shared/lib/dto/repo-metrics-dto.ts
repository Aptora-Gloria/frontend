// src/shared/lib/dto/repo-metrics-dto.ts

export interface RepoOverviewDto {
    fullName: string;
    name: string;
    description: string | null;
    htmlUrl: string;
    ownerLogin: string;
    ownerType: string;
    defaultBranch: string;
    primaryLanguage: string;
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    isPrivate: boolean | null;
    isFork: boolean;
    size: number;
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    lastSyncedAt: string;
    repositoryAgeDays: number;
    isActive: boolean;
    daysSinceLastPush: number;
}

export interface PrMetricsDto {
    totalPullRequests: number;
    openPullRequests: number;
    closedPullRequests: number;
    mergedPullRequests: number;
    draftPullRequests: number;
    mergeRate: number;
    averageAdditions: number;
    averageDeletions: number;
    averageChangedFiles: number;
    averageTotalChanges: number;
    largestPrSize: number;
    smallestPrSize: number;
    smallPrCount: number;
    mediumPrCount: number;
    largePrCount: number;
    smallPrPercentage: number;
    mediumPrPercentage: number;
    largePrPercentage: number;
    prsLast30Days: number;
    prsLast7Days: number;
    mergedLast30Days: number;
    averageMergeTimeHours: number;
    uniqueAuthors: number;
}

export interface CommitMetricsDto {
    totalCommits: number;
    mergeCommits: number;
    regularCommits: number;
    mergeCommitPercentage: number;
    commitsLast30Days: number;
    commitsLast7Days: number;
    lastCommitDate: string;
    mostActiveDay: string;
    mostActiveHour: number;
    commitsByHour: Record<string, number>;
    commitsByDayOfWeek: Record<string, number>;
    weekdayCommits: number;
    weekendCommits: number;
    weekdayPercentage: number;
    weekendPercentage: number;
    regularCommitPercentage: number;
}

export interface ReviewMetricsDto {
    totalReviews: number;
    approvedReviews: number;
    changesRequestedReviews: number;
    commentedReviews: number;
    reviewsByState: Record<string, number>;
    reviewsLast30Days: number;
    reviewsLast7Days: number;
    averageReviewsPerPr: number;
    prsWithoutReviews: number;
    prsWithReviewsPercentage: number;
    approvalRate: number;
    uniqueReviewers: number;
}

export interface BranchItemDto {
    branchName: string;
    commitCount: number;
    lastCommitDate: string;
    isDefault: boolean;
}

export interface BranchMetricsDto {
    totalBranches: number;
    defaultBranch: string;
    topBranchesByCommits: BranchItemDto[];
    commitsByBranch: Record<string, number>;
    branchesWithNoCommits: number;
    averageCommitsPerBranch: number;
}

export interface LanguageItemDto {
    language: string;
    bytes: number;
    percentage: number;
}

export interface RepoLanguageMetricsDto {
    totalLanguages: number;
    primaryLanguage: string;
    primaryLanguagePercentage: number;
    topLanguages: LanguageItemDto[];
    isMultiLanguage: boolean;
    languageDiversityScore: number;
}

export interface CodeQualityDto {
    averagePrSize: number;
    prMergeRate: number;
    averageReviewsPerPr: number;
    prsWithoutReviewsPercentage: number;
    smallPrPercentage: number;
    mergeCommitPercentage: number;
    averageCommitMessageLength: number;
    regularCommitPercentage: number;
    netCodeChange: number;
    codeGrowthRate: number;
    averageFilesChangedPerPr: number;
    overallQualityScore: number;
}

export interface ContributorItemDto {
    contributorLogin: string;
    commitCount: number;
    prCount: number;
    reviewCount: number;
    totalContributions: number;
}

export interface ContributorsMetricsDto {
    totalContributors: number;
    activeContributorsLast30Days: number;
    activeContributorsLast7Days: number;
    topContributorsByCommits: ContributorItemDto[];
    topContributorsByPrs: ContributorItemDto[];
    topContributorsByReviews: ContributorItemDto[];
}

export interface RepoHealthDto {
    activityScore: number;
    popularityScore: number;
    codeQualityScore: number;
    communityScore: number;
    overallHealthScore: number;
    healthStatus: string;
    breakdown: {
        activityWeight: number;
        popularityWeight: number;
        qualityWeight: number;
        communityWeight: number;
    };
}

export interface ActivityTrendItemDto {
    week: string;
    commits: number;
    pullRequests: number;
    reviews: number;
    totalActivity: number;
}

export interface ActivityTrendDto {
    weeklyTrend: ActivityTrendItemDto[];
    totalActivityLast30Days: number;
    totalActivityLast7Days: number;
    activityGrowthRate: number;
    commitsByDay?: Record<string, number>;
}

// ANA DTO
export interface RepoMetricsDto {
    overview: RepoOverviewDto;
    pullRequests: PrMetricsDto; // JSON'da ismi 'pullRequests' olarak geliyor
    commits: CommitMetricsDto;
    reviews: ReviewMetricsDto;
    branches: BranchMetricsDto;
    languages: RepoLanguageMetricsDto;
    activityTrend: ActivityTrendDto;
    codeQuality: CodeQualityDto;
    contributors: ContributorsMetricsDto;
    healthScore: RepoHealthDto;
}