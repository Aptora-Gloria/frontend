// Commit entity
export interface Commit {
  id: string;
  message: string;
  author: string;
  timestamp: Date;
  repoId: string;
}

