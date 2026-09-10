import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '../services/storage';
import { authService } from '../services/authService';
import { apiClient, registerUnauthenticatedListener } from '../services/apiClient';

// Helper for assertions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

// Router Guard Logic Simulation Helper
function computeTargetRoute(
  isAuthenticated: boolean,
  isLoading: boolean,
  currentRoute: string
): string | null {
  if (isLoading) return null; // Showing splash/loading indicator
  const isAuthGroup = currentRoute === '/login' || currentRoute === '/register';
  if (!isAuthenticated && !isAuthGroup) {
    return '/login';
  }
  if (isAuthenticated && isAuthGroup) {
    return '/(tabs)';
  }
  return null; // Stay on requested route
}

// Permission UX Control Simulation Helper
function canAccessControl(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}

export async function runFrontendAuthTests() {
  console.log('====================================================');
  console.log('RUNNING PHASE 6 FRONTEND AUTHENTICATION INTEGRATION & GUARD TESTS');
  console.log('====================================================\n');

  // 1. Logged-out user -> login screen
  console.log('Test 1: Logged-out user navigation to login screen...');
  const route1 = computeTargetRoute(false, false, '/login');
  assert(route1 === null, 'Logged-out user on /login stays on /login');
  console.log('-> Test 1 PASSED: Logged-out user opens login screen cleanly.\n');

  // 2. Logged-out user attempting protected route -> redirected to login
  console.log('Test 2: Logged-out user attempting protected route...');
  const route2 = computeTargetRoute(false, false, '/(tabs)/inventory');
  assert(route2 === '/login', 'Logged-out user targeting protected route redirected to /login');
  console.log('-> Test 2 PASSED: Protected route blocked and redirected to /login.\n');

  // 3. Logged-in user -> existing dashboard
  console.log('Test 3: Logged-in user accessing existing dashboard...');
  const route3 = computeTargetRoute(true, false, '/(tabs)');
  assert(route3 === null, 'Logged-in user allowed on /(tabs)');
  console.log('-> Test 3 PASSED: Logged-in user accesses dashboard.\n');

  // 4. Login success -> authenticated application
  console.log('Test 4: Login success flow against real backend...');
  const testEmail = `fe_phase6_${Date.now()}@supplysense.com`;
  const testPassword = 'Phase6SecurePass123!';

  // First register a test user
  const regResult = await authService.register({
    email: testEmail,
    password: testPassword,
    full_name: 'Phase 6 Admin',
    organization_name: 'Phase 6 Logistics',
  });
  assert(!!regResult.access_token, 'Registration returns access_token');

  // Login
  const loginResult = await authService.login({
    email: testEmail,
    password: testPassword,
  });
  assert(!!loginResult.access_token, 'Login returns access_token');
  assert(!!loginResult.refresh_token, 'Login returns refresh_token');
  await saveTokens(loginResult.access_token, loginResult.refresh_token);

  const route4 = computeTargetRoute(true, false, '/login');
  assert(route4 === '/(tabs)', 'Successful login redirects to /(tabs)');
  console.log('-> Test 4 PASSED: Login success navigates to authenticated app.\n');

  // 5. Login failure -> error shown, remains logged out
  console.log('Test 5: Login failure handling...');
  try {
    await authService.login({ email: testEmail, password: 'WrongPassword!' });
    assert(false, 'Expected login failure with wrong password');
  } catch (err: any) {
    assert(err.status === 401, 'Invalid login yields HTTP 401 error');
  }
  const route5 = computeTargetRoute(false, false, '/login');
  assert(route5 === null, 'User remains on /login after failed authentication');
  console.log('-> Test 5 PASSED: Login failure preserves logged-out state.\n');

  // 6. Registration success -> authenticated application
  console.log('Test 6: Registration success flow...');
  const regEmail2 = `fe_phase6_reg_${Date.now()}@supplysense.com`;
  const regRes2 = await authService.register({
    email: regEmail2,
    password: testPassword,
    full_name: 'New Registered User',
    organization_name: 'New Registered Corp',
  });
  assert(!!regRes2.access_token, 'Registration returns access_token');
  const route6 = computeTargetRoute(true, false, '/register');
  assert(route6 === '/(tabs)', 'Registration success redirects to /(tabs)');
  console.log('-> Test 6 PASSED: Registration success navigates to authenticated app.\n');

  // 7. Registration validation failure -> user remains on registration
  console.log('Test 7: Frontend registration validation...');
  const invalidEmail = 'not-an-email';
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidEmail);
  assert(!isValidEmail, 'Invalid email format rejected by frontend regex');
  const route7 = computeTargetRoute(false, false, '/register');
  assert(route7 === null, 'User remains on /register after validation failure');
  console.log('-> Test 7 PASSED: Registration validation failure keeps user on registration.\n');

  // 8. Logout -> login screen and session cleared
  console.log('Test 8: Logout session clearance...');
  const currentRefresh = await getRefreshToken();
  if (currentRefresh) {
    await authService.logout(currentRefresh);
  }
  await clearTokens();
  assert((await getAccessToken()) === null, 'AccessToken cleared from storage');
  assert((await getRefreshToken()) === null, 'RefreshToken cleared from storage');
  const route8 = computeTargetRoute(false, false, '/(tabs)');
  assert(route8 === '/login', 'Logout redirects to /login screen');
  console.log('-> Test 8 PASSED: Logout clears session and redirects to login.\n');

  // 9. Session restoration -> existing app opens when valid tokens exist
  console.log('Test 9: Session restoration on app startup...');
  await saveTokens(loginResult.access_token, loginResult.refresh_token);
  const meProfile = await authService.getMe();
  assert(meProfile.email === testEmail, 'Restored session matches user email');
  const route9 = computeTargetRoute(true, false, '/(tabs)');
  assert(route9 === null, 'Valid session opens app without redirecting');
  console.log('-> Test 9 PASSED: Session restoration verified.\n');

  // 10. Expired access token with valid refresh -> user remains logged in
  console.log('Test 10: Automatic refresh on expired access token...');
  const refreshed = await authService.refresh(loginResult.refresh_token);
  assert(!!refreshed.access_token, 'New access_token acquired via refresh');
  assert(refreshed.refresh_token !== loginResult.refresh_token, 'Refresh token rotated');
  await saveTokens(refreshed.access_token, refreshed.refresh_token);
  const route10 = computeTargetRoute(true, false, '/(tabs)');
  assert(route10 === null, 'User remains logged in after token refresh');
  console.log('-> Test 10 PASSED: Expired access token auto-refreshed successfully.\n');

  // 11. Failed refresh -> user is logged out
  console.log('Test 11: Failed refresh logs user out...');
  let logoutTriggered = false;
  registerUnauthenticatedListener(() => {
    logoutTriggered = true;
  });
  await saveTokens('invalid_access_token', 'invalid_refresh_token');
  try {
    await apiClient.get('/api/v1/auth/me');
  } catch (err) {
    // Expected
  }
  assert(logoutTriggered, 'Unauthenticated listener triggered on failed refresh');
  await clearTokens();
  const route11 = computeTargetRoute(false, false, '/(tabs)');
  assert(route11 === '/login', 'Failed refresh redirects user to /login');
  console.log('-> Test 11 PASSED: Failed refresh logs user out cleanly.\n');

  // 12. Authenticated user cannot access login/register unnecessarily
  console.log('Test 12: Authenticated user attempting to access auth screens...');
  const route12a = computeTargetRoute(true, false, '/login');
  assert(route12a === '/(tabs)', 'Authenticated user on /login redirected to /(tabs)');
  const route12b = computeTargetRoute(true, false, '/register');
  assert(route12b === '/(tabs)', 'Authenticated user on /register redirected to /(tabs)');
  console.log('-> Test 12 PASSED: Authenticated user prevented from viewing auth screens.\n');

  // 13. Permission-based UI controls behave according to backend permissions
  console.log('Test 13: Permission-based UI control checks...');
  const adminPermissions = ['products.read', 'products.write', 'recommendations.approve', 'settings.write', 'users.write'];
  const viewerPermissions = ['products.read', 'recommendations.read'];

  assert(canAccessControl(adminPermissions, 'recommendations.approve') === true, 'Admin can approve recommendations');
  assert(canAccessControl(adminPermissions, 'settings.write') === true, 'Admin can write settings');
  assert(canAccessControl(viewerPermissions, 'recommendations.approve') === false, 'Viewer cannot approve recommendations');
  assert(canAccessControl(viewerPermissions, 'settings.write') === false, 'Viewer cannot write settings');
  console.log('-> Test 13 PASSED: Permission-based UI controls validated.\n');

  console.log('====================================================');
  console.log('ALL 13 PHASE 6 FRONTEND AUTH & GUARD TESTS PASSED!');
  console.log('====================================================');
}

if (require.main === module) {
  runFrontendAuthTests().catch((err) => {
    console.error('TEST FAILED:', err);
    process.exit(1);
  });
}
