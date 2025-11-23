// src/entities/commit/index.ts

import type { CommitDto } from '@/shared/lib/dto/commit-dto';

export interface Commit {
  sha: string;
  message: string;

  authorName: string | null;
  authorLogin: string | null;

  committerName: string | null;
  committerLogin: string | null;

  authoredAt: string | null;
  committedAt: string | null;

  htmlUrl: string | null;   // <- string | null yaptık
}

export const mapCommitDtoToEntity = (dto: CommitDto): Commit => ({
  sha: dto.sha,
  message: dto.commit.message,

  authorName: dto.commit.author?.name ?? null,
  authorLogin: dto.author?.login ?? null,

  committerName: dto.commit.committer?.name ?? null,
  committerLogin: dto.committer?.login ?? null,

  authoredAt: dto.commit.author?.date ?? null,
  committedAt: dto.commit.committer?.date ?? null,

  htmlUrl: dto.html_url ?? null,   // <- null fallback
});
