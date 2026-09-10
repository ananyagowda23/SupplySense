/**
 * SupplySense API Configuration
 * 
 * Controls the FastAPI backend API base URL for development and production mobile builds.
 */

export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // Determine if running in local development mode
  const isDev =
    typeof __DEV__ !== 'undefined'
      ? __DEV__
      : process.env.NODE_ENV !== 'production';

  if (isDev) {
    return 'http://localhost:8000';
  }

  // In production builds, missing EXPO_PUBLIC_API_URL fails explicitly
  throw new Error(
    'FATAL CONFIG ERROR: EXPO_PUBLIC_API_URL must be explicitly configured for production builds.'
  );
}

export const API_BASE_URL = resolveApiBaseUrl();
