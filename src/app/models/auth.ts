export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tenantId: string;
  email: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface SessionInfo {
  tenantId: string;
  email: string;
}
