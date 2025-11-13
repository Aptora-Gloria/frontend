import apiClient from './api-client';

export interface AuthRequest {
  code: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface GitHubUserDto {
  id: number;
  githubUserId: number;
  login: string;
  accessToken: string;
  name: string | null;
  avatar_url: string | null;
  htmlUrl: string | null;
  ownerType: string | null;
  lastSyncedAt: string | null;
}

/**
 * Login with GitHub OAuth code
 * POST /auth/login
 */
export const login = async (code: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', { code });
  return response.data;
};

/**
 * Get current authenticated user
 * GET /auth/me
 */
export const getCurrentUser = async (): Promise<GitHubUserDto> => {
  const response = await apiClient.get<GitHubUserDto>('/auth/me');
  return response.data;
};

