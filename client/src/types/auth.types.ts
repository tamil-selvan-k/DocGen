export interface User {
  id: string;
  email: string;
  github: GitHubInfo | null;
  createdAt: string;
}

export interface GitHubInfo {
  id: string;
  username: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface SignupResponse {
  user: AuthUser;
}
