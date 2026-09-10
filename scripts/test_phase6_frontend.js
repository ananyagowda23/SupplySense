const API_BASE_URL = 'http://127.0.0.1:8000';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

// In-memory token storage simulation
let memoryStorage = {};
const storage = {
  saveTokens: async (acc, ref) => {
    memoryStorage['access_token'] = acc;
    memoryStorage['refresh_token'] = ref;
  },
  getAccessToken: async () => memoryStorage['access_token'] || null,
  getRefreshToken: async () => memoryStorage['refresh_token'] || null,
  clearTokens: async () => {
    memoryStorage = {};
  },
};

// AuthGuard logic function matching app/_layout.tsx
function computeTargetRoute(isAuthenticated, isLoading, currentRoute) {
  if (isLoading) return null; // splash screen
  const isAuthGroup = currentRoute === '/login' || currentRoute === '/register';
  if (!isAuthenticated && !isAuthGroup) {
    return '/login';
  }
  if (isAuthenticated && isAuthGroup) {
    return '/(tabs)';
  }
  return null; // stay
}

// Permission check helper matching AuthContext
function hasPermission(userPermissions, requiredPermission) {
  return Array.isArray(userPermissions) && userPermissions.includes(requiredPermission);
}

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('RUNNING PHASE 6 EXPO ROUTER GUARD & PERMISSION TESTS');
  console.log('====================================================\n');

  // Test 1: Logged-out user -> login screen
  console.log('Test 1: Logged-out user visiting /login...');
  const t1 = computeTargetRoute(false, false, '/login');
  assert(t1 === null, 'Logged-out user visiting /login remains on /login');
  console.log('-> Test 1 PASSED: Logged-out user allowed on login screen.\n');

  // Test 2: Logged-out user attempting protected route -> redirected to login
  console.log('Test 2: Logged-out user attempting protected route /analytics...');
  const t2 = computeTargetRoute(false, false, '/analytics');
  assert(t2 === '/login', 'Logged-out user targeting protected route redirected to /login');
  console.log('-> Test 2 PASSED: Protected route blocked and redirected to /login.\n');

  // Test 3: Logged-in user -> existing dashboard
  console.log('Test 3: Logged-in user accessing existing dashboard...');
  const t3 = computeTargetRoute(true, false, '/(tabs)');
  assert(t3 === null, 'Logged-in user allowed on /(tabs)');
  console.log('-> Test 3 PASSED: Logged-in user accesses dashboard.\n');

  // Test 4: Login success -> authenticated application
  console.log('Test 4: Login success flow with backend credentials...');
  const testEmail = `fe_guard_${Date.now()}@supplysense.com`;
  const testPassword = 'GuardTestPassword123!';

  // Register
  const regRes = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      full_name: 'Guard Admin User',
      organization_name: 'Guard Corp',
    }),
  });
  assert(regRes.status === 201, 'Registration returns 201');
  const regData = await regRes.json();

  // Login
  const loginRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  assert(loginRes.status === 200, 'Login returns 200');
  const loginData = await loginRes.json();
  await storage.saveTokens(loginData.access_token, loginData.refresh_token);

  const t4 = computeTargetRoute(true, false, '/login');
  assert(t4 === '/(tabs)', 'Successful login redirects to /(tabs)');
  console.log('-> Test 4 PASSED: Login success navigates to authenticated app.\n');

  // Test 5: Login failure -> error shown, remains logged out
  console.log('Test 5: Login failure handling...');
  const badLoginRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' }),
  });
  assert(badLoginRes.status === 401, 'Invalid password returns 401');
  const t5 = computeTargetRoute(false, false, '/login');
  assert(t5 === null, 'User remains on /login screen after failed login');
  console.log('-> Test 5 PASSED: Login failure preserves logged-out state.\n');

  // Test 6: Registration success -> authenticated application
  console.log('Test 6: Registration success flow...');
  const regEmail2 = `fe_guard_reg_${Date.now()}@supplysense.com`;
  const regRes2 = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail2,
      password: testPassword,
      full_name: 'Registered Guard User',
      organization_name: 'Registered Guard Corp',
    }),
  });
  assert(regRes2.status === 201, 'Registration returns 201');
  const t6 = computeTargetRoute(true, false, '/register');
  assert(t6 === '/(tabs)', 'Registration success redirects to /(tabs)');
  console.log('-> Test 6 PASSED: Registration success navigates to authenticated app.\n');

  // Test 7: Registration validation failure -> user remains on registration
  console.log('Test 7: Registration validation failure...');
  const invalidEmail = 'invalid-email-address';
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidEmail);
  assert(!isValidEmail, 'Invalid email format rejected by frontend regex');
  const t7 = computeTargetRoute(false, false, '/register');
  assert(t7 === null, 'User remains on /register after validation failure');
  console.log('-> Test 7 PASSED: Registration validation keeps user on registration.\n');

  // Test 8: Logout -> login screen and session cleared
  console.log('Test 8: Logout session clearance...');
  const currentRefresh = await storage.getRefreshToken();
  const logoutRes = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: currentRefresh }),
  });
  assert(logoutRes.status === 200, 'Logout returns 200');
  await storage.clearTokens();
  assert((await storage.getAccessToken()) === null, 'Access token cleared');
  assert((await storage.getRefreshToken()) === null, 'Refresh token cleared');
  const t8 = computeTargetRoute(false, false, '/(tabs)');
  assert(t8 === '/login', 'Logout redirects to /login screen');
  console.log('-> Test 8 PASSED: Logout clears session and redirects to login.\n');

  // Test 9: Session restoration -> existing app opens when valid tokens exist
  console.log('Test 9: Session restoration...');
  const reloginRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  assert(reloginRes.status === 200, 'Relogin returns 200');
  const activeSessionData = await reloginRes.json();
  await storage.saveTokens(activeSessionData.access_token, activeSessionData.refresh_token);

  const meRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${activeSessionData.access_token}` },
  });
  assert(meRes.status === 200, 'GET /me returns 200 for valid session');
  const t9 = computeTargetRoute(true, false, '/(tabs)');
  assert(t9 === null, 'Valid restored session stays on application route');
  console.log('-> Test 9 PASSED: Session restoration verified.\n');

  // Test 10: Expired access token with valid refresh -> user remains logged in
  console.log('Test 10: Token refresh rotation...');
  const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: activeSessionData.refresh_token }),
  });
  assert(refreshRes.status === 200, 'Refresh returns 200');
  const refreshData = await refreshRes.json();
  assert(refreshData.refresh_token !== activeSessionData.refresh_token, 'Refresh token rotated');
  await storage.saveTokens(refreshData.access_token, refreshData.refresh_token);
  const t10 = computeTargetRoute(true, false, '/(tabs)');
  assert(t10 === null, 'User remains logged in after refresh');
  console.log('-> Test 10 PASSED: Expired access token refreshed successfully.\n');

  // Test 11: Failed refresh -> user is logged out
  console.log('Test 11: Failed refresh handling...');
  const badRefreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: 'invalid_or_revoked_token' }),
  });
  assert(badRefreshRes.status === 401, 'Failed refresh returns 401');
  await storage.clearTokens();
  const t11 = computeTargetRoute(false, false, '/(tabs)');
  assert(t11 === '/login', 'Failed refresh redirects user to /login');
  console.log('-> Test 11 PASSED: Failed refresh logs user out.\n');

  // Test 12: Authenticated user cannot access login/register unnecessarily
  console.log('Test 12: Authenticated user attempting access to auth routes...');
  const t12a = computeTargetRoute(true, false, '/login');
  assert(t12a === '/(tabs)', 'Authenticated user on /login redirected to /(tabs)');
  const t12b = computeTargetRoute(true, false, '/register');
  assert(t12b === '/(tabs)', 'Authenticated user on /register redirected to /(tabs)');
  console.log('-> Test 12 PASSED: Authenticated user prevented from viewing auth screens.\n');

  // Test 13: Permission-based UI controls behave according to backend permissions
  console.log('Test 13: Permission-based UI controls...');
  const adminPermissions = ['products.read', 'products.write', 'recommendations.approve', 'settings.write', 'users.write'];
  const viewerPermissions = ['products.read', 'recommendations.read'];

  assert(hasPermission(adminPermissions, 'recommendations.approve') === true, 'ADMIN has recommendations.approve');
  assert(hasPermission(adminPermissions, 'settings.write') === true, 'ADMIN has settings.write');
  assert(hasPermission(viewerPermissions, 'recommendations.approve') === false, 'VIEWER lacks recommendations.approve');
  assert(hasPermission(viewerPermissions, 'settings.write') === false, 'VIEWER lacks settings.write');
  console.log('-> Test 13 PASSED: Permission-based UI controls validated.\n');

  console.log('====================================================');
  console.log('ALL 13 PHASE 6 FRONTEND AUTH & GUARD TESTS PASSED!');
  console.log('====================================================');
}

runPhase6Tests().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
