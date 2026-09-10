import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'supplysense_access_token';
const REFRESH_TOKEN_KEY = 'supplysense_refresh_token';

// In-memory fallback for web SSR or environments without localStorage
let inMemoryStore: Record<string, string> = {};

const isWeb = Platform.OS === 'web';

/**
 * Securely save access and refresh tokens.
 */
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        inMemoryStore[ACCESS_TOKEN_KEY] = accessToken;
        inMemoryStore[REFRESH_TOKEN_KEY] = refreshToken;
      }
    } else {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (error) {
    console.error('Failed to securely store authentication tokens');
  }
}

/**
 * Retrieve saved access token.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(ACCESS_TOKEN_KEY);
      }
      return inMemoryStore[ACCESS_TOKEN_KEY] || null;
    }
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to retrieve access token');
    return null;
  }
}

/**
 * Retrieve saved refresh token.
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return inMemoryStore[REFRESH_TOKEN_KEY] || null;
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to retrieve refresh token');
    return null;
  }
}

/**
 * Clear stored authentication tokens.
 */
export async function clearTokens(): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      inMemoryStore = {};
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to clear authentication tokens');
  }
}
