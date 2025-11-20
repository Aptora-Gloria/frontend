// src/entities/commit/index.ts

export interface Commit {
  sha: string;
  message: string;

  authorName: string;
  authorLogin: string;

  committerName: string;
  committerLogin: string;

  authoredAt: string;  // ISO string
  committedAt: string; // ISO string

  htmlUrl: string;
}
