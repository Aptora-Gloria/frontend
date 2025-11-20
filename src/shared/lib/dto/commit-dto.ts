export interface CommitAuthor {
    name: string;
    email: string;
    date: string; // ISO date-time
}

export interface CommitCommitter {
    name: string;
    email: string;
    date: string; // ISO date-time
}

export interface CommitInfo {
    message: string;
    author: CommitAuthor;
    committer: CommitCommitter;
}

export interface AuthorInfo {
    login: string;
}

export interface CommitterInfo {
    login: string;
}

export interface ParentInfo {
    sha: string;
}

// Asıl CommitDto – OpenAPI şemasına göre
export interface CommitDto {
    sha: string;
    node_id: string;
    commit: CommitInfo;
    author: AuthorInfo | null;
    committer: CommitterInfo | null;
    parents: ParentInfo[];
    html_url: string;
    url: string;
}