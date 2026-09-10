const API_BASE_URL = 'http://127.0.0.1:8000';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING PHASE 5 FRONTEND AUTHENTICATION INTEGRATION TESTS');
  console.log('====================================================\n');

  // Test 1: Health check backend connection
  console.log('Test 1: Connecting to backend auth API...');
  const healthRes = await fetch(`${API_BASE_URL}/docs`);
  assert(healthRes.status === 200, 'Backend is reachable on port 8000');
  console.log('-> Test 1 PASSED: Backend connection established.\n');

  // Test 2: User & Organization Registration
  console.log('Test 2: Testing POST /api/v1/auth/register...');
  const testEmail = `fe_phase5_${Date.now()}@supplysense.com`;
  const regPayload = {
    email: testEmail,
    password: 'SecurePhase5Password123!',
    full_name: 'Phase 5 User',
    organization_name: 'Phase 5 Enterprise',
  };

  const regRes = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });

  assert(regRes.status === 201, `Registration returned HTTP 201 (got ${regRes.status})`);
  const regData = await regRes.json();
  assert(!!regData.access_token, 'Registration response contains access_token');
  assert(!!regData.refresh_token, 'Registration response contains refresh_token');
  assert(regData.role === 'ADMIN', 'Registered user assigned ADMIN role');
  console.log('-> Test 2 PASSED: Registration succeeded with bearer tokens.\n');

  // Test 3: Session Profile GET /api/v1/auth/me
  console.log('Test 3: Testing GET /api/v1/auth/me session restoration...');
  const meRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${regData.access_token}` },
  });
  assert(meRes.status === 200, 'GET /me returns HTTP 200');
  const meData = await meRes.json();
  assert(meData.email === testEmail, '/me email matches registered email');
  assert(meData.role === 'ADMIN', '/me role is ADMIN');
  assert(Array.isArray(meData.permissions), '/me permissions is an array');
  assert(meData.permissions.includes('products.read'), 'Permissions include products.read');
  console.log('-> Test 3 PASSED: /me session profile verified.\n');

  // Test 4: User Login POST /api/v1/auth/login
  console.log('Test 4: Testing POST /api/v1/auth/login...');
  const loginRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'SecurePhase5Password123!',
    }),
  });
  assert(loginRes.status === 200, 'Login returned HTTP 200');
  const loginData = await loginRes.json();
  assert(!!loginData.access_token, 'Login returned access_token');
  assert(!!loginData.refresh_token, 'Login returned refresh_token');
  console.log('-> Test 4 PASSED: Login authentication verified.\n');

  // Test 5: Invalid Password Rejection
  console.log('Test 5: Testing invalid login credentials rejection...');
  const badLoginRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword123!',
    }),
  });
  assert(badLoginRes.status === 401, 'Invalid password rejected with HTTP 401');
  console.log('-> Test 5 PASSED: Invalid password rejected cleanly.\n');

  // Test 6: Access Token Refresh POST /api/v1/auth/refresh
  console.log('Test 6: Testing POST /api/v1/auth/refresh...');
  const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: loginData.refresh_token }),
  });
  assert(refreshRes.status === 200, 'Refresh returned HTTP 200');
  const refreshData = await refreshRes.json();
  assert(!!refreshData.access_token, 'Refresh returned new access_token');
  assert(refreshData.refresh_token !== loginData.refresh_token, 'Refresh token was rotated');
  console.log('-> Test 6 PASSED: Refresh token rotation verified.\n');

  // Test 7: Logout POST /api/v1/auth/logout & Revocation
  console.log('Test 7: Testing POST /api/v1/auth/logout...');
  const logoutRes = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshData.refresh_token }),
  });
  assert(logoutRes.status === 200, 'Logout returned HTTP 200');

  // Attempting refresh with revoked token -> HTTP 401
  const badRefreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshData.refresh_token }),
  });
  assert(badRefreshRes.status === 401, 'Revoked refresh token rejected with HTTP 401');
  console.log('-> Test 7 PASSED: Logout revocation verified.\n');

  console.log('====================================================');
  console.log('ALL PHASE 5 AUTHENTICATION INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
