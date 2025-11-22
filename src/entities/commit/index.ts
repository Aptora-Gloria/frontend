import type { CommitDto } from '@shared/lib/dto/commit-dto';

export interface Commit {
  sha: string;
  message: string;
  authorName: string;
  authorLogin: string;
  committerName: string;
  committerLogin: string;
  authoredAt: string;   // ISO
  committedAt: string;  // ISO
  htmlUrl: string;
}

export const mapCommitDtoToEntity = (dto: CommitDto): Commit => ({
  sha: dto.sha,
  message: dto.commit.message,
  authorName: dto.commit.author?.name ?? '',
  authorLogin: dto.author?.login ?? '',
  committerName: dto.commit.committer?.name ?? '',
  committerLogin: dto.committer?.login ?? '',
  authoredAt: dto.commit.author?.date ?? '',
  committedAt: dto.commit.committer?.date ?? '',
  htmlUrl: dto.htmlUrl ?? dto.html_url ?? ''
});
