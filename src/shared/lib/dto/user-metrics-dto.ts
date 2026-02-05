// src/shared/lib/dto/user-metrics-dto.ts

export interface PrMergeRateDto {
    totalPullRequests: number;
    mergedPullRequests: number;
    openPullRequests: number;
    closedPullRequests: number;
    mergeRate: number;
    averageMergeTimeHours: number;
}

export interface PrSizeDto {
    averageAdditions: number;
    averageDeletions: number;
    averageChangedFiles: number;
    averageTotalChanges: number;
    smallPrCount: number;
    mediumPrCount: number;
    largePrCount: number;
    smallPrPercentage: number;
    mediumPrPercentage: number;
    largePrPercentage: number;
}

export interface ReviewStatsDto {
    totalReviews: number;
    approvedReviews: number;
    changesRequestedReviews: number;
    commentedReviews: number;
    averageReviewsPerPr: number;
    approvalRate: number;
    reviewsByState: Record<string, number>;
    prsWithoutReviews: number;
    prsWithReviewsPercentage: number;
}

export interface CommitTimeAnalysisDto {
    commitsByHour: Record<string, number>;
    commitsByDayOfWeek: Record<string, number>;
    weekdayCommits: number;
    weekendCommits: number;
    weekdayPercentage: number;
    weekendPercentage: number;
    mostActiveHour: number;
    mostActiveDay: string;
    last30DaysCommits: number;
    last7DaysCommits: number;
}

export interface LanguageUsageDto {
    language: string;
    repoCount: number;
    totalPercentage: number;
    totalBytes: number;
}

export interface LanguageDiversityDto {
    totalLanguages: number;
    uniqueLanguagesAcrossRepos: number;
    averageLanguagesPerRepo: number;
    languageUsageCount: Record<string, number>;
    languagePercentageDistribution: Record<string, number>;
    topLanguages: LanguageUsageDto[];
    singleLanguageRepos: number;
    multiLanguageRepos: number;
    multiLanguageReposPercentage: number;
}

export interface WeeklyTrendDto {
    week: string;
    commits: number;
    pullRequests: number;
    reviews: number;
    totalActivity: number;
}

export interface MonthlyTrendDto {
    month: string;
    commits: number;
    pullRequests: number;
    reviews: number;
    totalActivity: number;
}

export interface ActivityTrendDto {
    weeklyTrend: WeeklyTrendDto[];
    monthlyTrend: MonthlyTrendDto[];
    totalActivityLast30Days: number;
    totalActivityLast7Days: number;
    activityGrowthRate: number;
    mostActiveWeek: string;
    mostActiveMonth: string;
    last30DaysBreakdown: {
        commits: number;
        pullRequests: number;
        reviews: number;
        commitsByDay: Record<string, number>;
        prsByDay: Record<string, number>;
    };
}

export interface UserMetricsDto {
    prMergeRate: PrMergeRateDto;
    prSize: PrSizeDto;
    reviewStats: ReviewStatsDto;
    commitTimeAnalysis: CommitTimeAnalysisDto;
    languageDiversity: LanguageDiversityDto;
    activityTrend: ActivityTrendDto;
}