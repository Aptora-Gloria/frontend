// src/entities/repo.ts

export type Repo = {
    id: string;
    name: string;
    fullName: string;
    description: string;
    htmlUrl: string;
    isPrivate: boolean;
    isFork: boolean;
    stargazers: number;
    watchers: number;
    forks: number;
    openIssues: number;
    size: number;
    language: string;
    defaultBranch: string;
};

// Backend RepoDto ile birebir eşleşen DTO tipi
export type RepoDto = {
    id: string | number;
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    isPrivate: boolean;
    isFork: boolean;
    stargazers: number;
    watchers: number;
    forks: number;
    openIssues: number;
    size: number;
    language: string | null;
    defaultBranch: string;
};

// DÖNÜŞTÜRÜCÜ
export const mapRepoDtoToEntity = (dto: RepoDto): Repo => ({
    id: String(dto.id),
    name: dto.name,
    fullName: dto.fullName,
    description: dto.description ?? "",
    htmlUrl: dto.htmlUrl,
    isPrivate: dto.isPrivate,
    isFork: dto.isFork,
    stargazers: dto.stargazers,
    watchers: dto.watchers,
    forks: dto.forks,
    openIssues: dto.openIssues,
    size: dto.size,
    language: dto.language ?? "Unknown",
    defaultBranch: dto.defaultBranch,
});
