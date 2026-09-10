import { apiClient } from './apiClient';
import {
  LoginRequest,
  RegisterRequest,
  SwitchOrganizationRequest,
  TokenResponse,
  UserProfile,
} from '../types/auth';

export const authService = {
  /**
   * Register a new user and organization.
   */
  async register(payload: RegisterRequest): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/api/v1/auth/register', payload, {
      skipAuth: true,
    });
  },

  /**
   * Authenticate user with email and password.
   */
  async login(payload: LoginRequest): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/api/v1/auth/login', payload, {
      skipAuth: true,
    });
  },

  /**
   * Refresh access token using refresh token.
   */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>(
      '/api/v1/auth/refresh',
      { refresh_token: refreshToken },
      { skipAuth: true }
    );
  },

  /**
   * Revoke refresh token on backend logout.
   */
  async logout(refreshToken: string): Promise<{ status: string }> {
    return apiClient.post<{ status: string }>(
      '/api/v1/auth/logout',
      { refresh_token: refreshToken },
      { skipAuth: true }
    );
  },

  /**
   * Retrieve current user profile, active organization, role, and explicit permissions.
   */
  async getMe(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/api/v1/auth/me');
  },

  /**
   * Switch active organization for the authenticated user.
   */
  async switchOrganization(organizationId: string): Promise<TokenResponse> {
    const payload: SwitchOrganizationRequest = { organization_id: organizationId };
    return apiClient.post<TokenResponse>(
      '/api/v1/auth/switch-organization',
      payload
    );
  },
};
