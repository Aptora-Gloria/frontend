export interface CommitAuthorInfo {
    name: string | null;
    email: string | null;
    date: string | null;
}

export interface CommitCore {
    message: string;
    author: CommitAuthorInfo | null;
    committer: CommitAuthorInfo | null;
}

export interface CommitDto {
    // DB alanları
    id?: number;
    sha: string;

    // GitHub commit objesi
    commit: CommitCore;

    // Login bilgileri
    author?: { login?: string | null } | null;
    committer?: { login?: string | null } | null;

    // URL’ler
    htmlUrl?: string | null;
    html_url?: string | null;
}
