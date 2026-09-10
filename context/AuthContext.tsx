import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AuthContextType,
  LoginRequest,
  OrganizationInfo,
  RegisterRequest,
  UserProfile,
} from '../types/auth';
import { authService } from '../services/authService';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '../services/storage';
import { registerUnauthenticatedListener } from '../services/apiClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Helper to set authenticated user state from /api/v1/auth/me profile response.
   */
  const applyUserProfile = (profile: UserProfile) => {
    setUser(profile);
    setRole(profile.role || null);
    setPermissions(profile.permissions || []);
    setOrganization({
      id: profile.organization_id,
      name: profile.organization_name || 'Organization',
      slug: '',
      is_active: true,
    });
    setIsAuthenticated(true);
  };

  /**
   * Reset all authentication state.
   */
  const resetAuthState = () => {
    setUser(null);
    setOrganization(null);
    setRole(null);
    setPermissions([]);
    setIsAuthenticated(false);
  };

  /**
   * Restore user session on application startup.
   */
  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();

      if (!accessToken && !refreshToken) {
        resetAuthState();
        return;
      }

      try {
        const profile = await authService.getMe();
        applyUserProfile(profile);
      } catch (err: any) {
        // If /me failed, attempt refresh using stored refresh token if present
        if (refreshToken) {
          try {
            const tokenRes = await authService.refresh(refreshToken);
            await saveTokens(tokenRes.access_token, tokenRes.refresh_token);
            const profile = await authService.getMe();
            applyUserProfile(profile);
          } catch (refreshErr) {
            await clearTokens();
            resetAuthState();
          }
        } else {
          await clearTokens();
          resetAuthState();
        }
      }
    } catch (error) {
      await clearTokens();
      resetAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Register listener for un-refreshable 401s from apiClient
    registerUnauthenticatedListener(() => {
      resetAuthState();
    });

    refreshSession();
  }, []);

  /**
   * Authenticate user with credentials and store session.
   */
  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const tokenRes = await authService.login(credentials);
      await saveTokens(tokenRes.access_token, tokenRes.refresh_token);
      const profile = await authService.getMe();
      applyUserProfile(profile);
    } catch (error) {
      resetAuthState();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user & organization and store session.
   */
  const register = async (payload: RegisterRequest) => {
    setIsLoading(true);
    try {
      const tokenRes = await authService.register(payload);
      await saveTokens(tokenRes.access_token, tokenRes.refresh_token);
      const profile = await authService.getMe();
      applyUserProfile(profile);
    } catch (error) {
      resetAuthState();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log out user, revoke refresh token on backend, and clear local state.
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          await authService.logout(refreshToken);
        } catch (backendError) {
          // Log out locally even if backend network call fails
          console.warn('Backend logout revocation encountered an error:', backendError);
        }
      }
    } finally {
      await clearTokens();
      resetAuthState();
      setIsLoading(false);
    }
  };

  /**
   * Switch active organization for the current authenticated user.
   */
  const switchOrganization = async (organizationId: string) => {
    setIsLoading(true);
    try {
      const tokenRes = await authService.switchOrganization(organizationId);
      await saveTokens(tokenRes.access_token, tokenRes.refresh_token);
      const profile = await authService.getMe();
      applyUserProfile(profile);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        role,
        permissions,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to consume AuthContext.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
