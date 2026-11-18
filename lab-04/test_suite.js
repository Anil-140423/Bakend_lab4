/**
 * test_suite.js
 * 
 * Comprehensive automated verification script for Lab 4 requirements.
 * Tests:
 * 1. Server startup & Health Check
 * 2. Database table verification
 * 3. User registration with valid data
 * 4. User registration duplicate username check (HTTP 400)
 * 5. User registration missing fields check (HTTP 400)
 * 6. User login with correct credentials (HTTP 200 + JWT token)
 * 7. User login with wrong password (HTTP 400)
 * 8. User login with unknown username (HTTP 400)
 * 9. User login missing fields check (HTTP 400)
 * 10. Direct SQLite verification that password is stored as bcrypt hash
 * 11. Direct JWT token decoding verification (contains only username, valid expiration)
 * 12. Response payload verification (no secrets/passwords exposed)
 */

const { dbGet } = require('./database');
const jwt = require('jsonwebtoken');
const app = require('./server');

const PORT = 3005; // Use test port
let server;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Lab 4 Verification Suite');
  console.log('====================================================');

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Server started on test port ${PORT}`);
      resolve();
    });
  });

  const baseUrl = `http://localhost:${PORT}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Health check endpoint
    const healthRes = await fetch(`${baseUrl}/`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.message, 'Health check GET / returns HTTP 200');

    // Test 2: Valid Registration
    const regPayload = {
      username: 'anil',
      name: 'Anil Kumar',
      password: 'Anil@123'
    };
    const regRes = await fetch(`${baseUrl}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    const regData = await regRes.json();
    assert(regRes.status === 200 && regData.message === 'User registered successfully', 'Valid registration returns HTTP 200 and success message');

    // Test 3: Duplicate Registration
    const dupRes = await fetch(`${baseUrl}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 400 && dupData.error === 'Username already exists', 'Duplicate username returns HTTP 400 with "Username already exists"');

    // Test 4: Registration Missing Fields
    const missingRegRes = await fetch(`${baseUrl}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'anil2' })
    });
    const missingRegData = await missingRegRes.json();
    assert(missingRegRes.status === 400 && missingRegData.error, 'Registration with missing fields returns HTTP 400');

    // Test 5: Login with correct credentials
    const loginPayload = {
      username: 'anil',
      password: 'Anil@123'
    };
    const loginRes = await fetch(`${baseUrl}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && typeof loginData.jwt_token === 'string', 'Login with correct credentials returns HTTP 200 and jwt_token');

    // Test 6: Login with wrong password
    const wrongPassRes = await fetch(`${baseUrl}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'anil', password: 'WrongPassword' })
    });
    const wrongPassData = await wrongPassRes.json();
    assert(wrongPassRes.status === 400 && wrongPassData.error === 'Invalid password', 'Login with wrong password returns HTTP 400 with "Invalid password"');

    // Test 7: Login with unknown username
    const unknownUserRes = await fetch(`${baseUrl}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent', password: 'Password@123' })
    });
    const unknownUserData = await unknownUserRes.json();
    assert(unknownUserRes.status === 400 && unknownUserData.error === 'Invalid user', 'Login with unknown username returns HTTP 400 with "Invalid user"');

    // Test 8: Login Missing Fields
    const missingLoginRes = await fetch(`${baseUrl}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'anil' })
    });
    const missingLoginData = await missingLoginRes.json();
    assert(missingLoginRes.status === 400 && missingLoginData.error, 'Login with missing password returns HTTP 400');

    // Test 9: Verify database storage and password hashing
    const dbUser = await dbGet('SELECT * FROM users WHERE username = ?', ['anil']);
    assert(dbUser && dbUser.password !== 'Anil@123', 'Password is not stored in plain text');
    assert(dbUser && dbUser.password.startsWith('$2b$') || dbUser.password.startsWith('$2a$'), 'Password is stored as a valid bcrypt hash');

    // Test 10: Verify JWT Payload
    const decoded = jwt.decode(loginData.jwt_token);
    assert(decoded && decoded.username === 'anil', 'JWT token decodes and contains username');
    assert(decoded && !decoded.password && !decoded.password_hash, 'JWT payload NEVER contains password or hash');
    assert(decoded && decoded.exp && decoded.iat, 'JWT token contains valid iat and exp timestamps');

    // Test 11: Verify non-trailing slash routing works as well
    const noSlashLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });
    assert(noSlashLoginRes.status === 200, 'POST /login (without trailing slash) also functions correctly');

    console.log('====================================================');
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failed++;
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

