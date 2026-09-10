import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './storage';
import { TokenResponse } from '../types/auth';
import { API_BASE_URL } from '../constants/config';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let unauthenticatedListener: (() => void) | null = null;

/**
 * Register callback to notify AuthContext when authentication session is invalidated.
 */
export function registerUnauthenticatedListener(callback: () => void) {
  unauthenticatedListener = callback;
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  isRetry?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Perform token refresh synchronously using mutex pattern.
 */
async function performTokenRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`Refresh failed with status ${response.status}`);
      }

      const data: TokenResponse = await response.json();
      await saveTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch (err) {
      await clearTokens();
      if (unauthenticatedListener) {
        unauthenticatedListener();
      }
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Centralized API Client handling authentication headers, error mapping,
 * and automatic single-retry token refresh on 401 Unauthorized.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, isRetry = false, headers: customHeaders, ...fetchOptions } = options;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (error: any) {
    throw new ApiError(
      0,
      error?.message || 'Network request failed. Please check your internet connection.',
      error
    );
  }

  // Handle 401 Unauthorized with single automatic token refresh attempt
  if (
    response.status === 401 &&
    !skipAuth &&
    !isRetry &&
    !normalizedEndpoint.includes('/auth/login') &&
    !normalizedEndpoint.includes('/auth/refresh')
  ) {
    const newAccessToken = await performTokenRefresh();
    if (newAccessToken) {
      // Retry original request ONCE with new access token
      return apiRequest<T>(endpoint, {
        ...options,
        isRetry: true,
      });
    } else {
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  // Parse response body
  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const detail = typeof data === 'object' && data?.detail ? data.detail : null;
    const message =
      typeof detail === 'string'
        ? detail
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
