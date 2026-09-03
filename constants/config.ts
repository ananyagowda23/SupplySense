/**
 * SupplySense API Configuration
 * 
 * Controls the FastAPI backend API base URL for development and physical phone testing.
 * 
 * To test on a physical phone:
 * 1. Set EXPO_PUBLIC_API_URL in your .env file:
 *    EXPO_PUBLIC_API_URL=http://<MY_LAPTOP_IP>:8000
 * 2. Run Expo using `npx expo start`
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
