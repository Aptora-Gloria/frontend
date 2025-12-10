export interface RepoDto {
    id: number;
    githubRepoId: number;
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    isPrivate: boolean;
    isFork: boolean;
    stargazersCount: number;
    watchersCount: number;
    forksCount: number;
    openIssuesCount: number;
    size: number;
    language: string | null;
    defaultBranch: string | null;
    createdAt: string;    // OffsetDateTime → ISO string
    updatedAt: string;
    pushedAt: string;
    ownerLogin: string;
    ownerType: string;    // backend OwnerType enum’unun string hali
    lastSyncedAt: string | null;
}
