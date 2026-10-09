// Run against staging with two verified test users
import assert from 'node:assert/strict';

const base = 'https://weegzqzxbqeeokkiifpt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWd6cXp4YnFlZW9ra2lpZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTI1MDksImV4cCI6MjA4MTE2ODUwOX0.glav1HW9MEEjuae-2Ndq-V0uyyYKrLaJdGwbdxYFArA';

const userA = {
  email: 'testuser.a.accounts@gmail.com',
  password: 'QuranHikmaTest2024!'
};

const userB = {
  email: 'testuser.b.accounts@gmail.com',
  password: 'StagingTest2024!z'
};

async function login(email, password) {
  const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  const d = await r.json();
  if (!r.ok) {
    console.error('Login failed:', d);
    throw new Error(`Login failed for ${email}: ${d.error_description || d.message}`);
  }
  return d;
}

async function api(token, path, method = 'GET', body) {
  const r = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return {
    status: r.status,
    data: await r.json().catch(() => null)
  };
}

async function runTests() {
  console.log('Starting privacy tests...\n');

  // Login both users
  console.log('Logging in User A...');
  const a = await login(userA.email, userA.password);
  console.log(`✓ User A logged in (ID: ${a.user.id})\n`);

  console.log('Logging in User B...');
  const b = await login(userB.email, userB.password);
  console.log(`✓ User B logged in (ID: ${b.user.id})\n`);

  assert.notEqual(a.user.id, b.user.id, 'Users should have different IDs');
  console.log('✓ Users have different IDs\n');

  let researchId;

  try {
    // Test 1: User A creates research
    console.log('Test 1: User A creates research...');
    const created = await api(
      a.access_token,
      'qh_research',
      'POST',
      {
        user_id: a.user.id,
        kind: 'note',
        title: 'Privacy Test',
        body: 'Private marker'
      }
    );
    assert.equal(created.status, 201, `Expected 201, got ${created.status}`);
    researchId = created.data[0].id;
    console.log(`✓ User A created research (ID: ${researchId})\n`);

    // Test 2: User A can read own research
    console.log('Test 2: User A can read own research...');
    const ownRead = await api(a.access_token, `qh_research?id=eq.${researchId}`);
    assert.equal(ownRead.data.length, 1, 'User A should see own research');
    console.log('✓ User A can read own research\n');

    // Test 3: User B cannot read User A's research
    console.log('Test 3: User B cannot read User A\'s research...');
    const otherRead = await api(b.access_token, `qh_research?id=eq.${researchId}`);
    assert.equal(otherRead.data.length, 0, 'User B should NOT see User A research');
    console.log('✓ User B cannot read User A\'s research\n');

    // Test 4: Anon cannot read research
    console.log('Test 4: Anon user cannot read research...');
    const anonRead = await api(key, `qh_research?id=eq.${researchId}`);
    assert(anonRead.status >= 400 || anonRead.data.length === 0, 'Anon should not access');
    console.log('✓ Anon user cannot read research\n');

    // Test 5: User B cannot modify User A's research
    console.log('Test 5: User B cannot modify User A\'s research...');
    const modify = await api(
      b.access_token,
      `qh_research?id=eq.${researchId}`,
      'PATCH',
      { body: 'Changed' }
    );
    assert(modify.status >= 400 || modify.data.length === 0, 'User B should not modify');
    console.log('✓ User B cannot modify User A\'s research\n');

    // Test 6: User B cannot delete User A's research
    console.log('Test 6: User B cannot delete User A\'s research...');
    const deleteAttempt = await api(
      b.access_token,
      `qh_research?id=eq.${researchId}`,
      'DELETE'
    );
    assert(deleteAttempt.status >= 400 || deleteAttempt.data.length === 0, 'User B should not delete');
    console.log('✓ User B cannot delete User A\'s research\n');

    // Test 7: User B cannot spoof user_id
    console.log('Test 7: User B cannot create research with User A\'s user_id...');
    const spoof = await api(
      b.access_token,
      'qh_research',
      'POST',
      { user_id: a.user.id, kind: 'note', body: 'Spoof' }
    );
    assert(spoof.status >= 400, 'User B should not be able to spoof');
    console.log('✓ User B cannot spoof user_id\n');

    // Test 8: Verify data still intact
    console.log('Test 8: Verifying data integrity...');
    const intact = await api(a.access_token, `qh_research?id=eq.${researchId}`);
    assert.equal(intact.data[0].body, 'Private marker', 'Data should be unchanged');
    console.log('✓ Data remains intact and unchanged\n');

    console.log('═══════════════════════════════════════════');
    console.log('ALL PRIVACY TESTS PASSED ✓');
    console.log('═══════════════════════════════════════════\n');

  } finally {
    // Cleanup
    if (researchId) {
      console.log('Cleaning up test data...');
      await api(a.access_token, `qh_research?id=eq.${researchId}`, 'DELETE');
      console.log('✓ Test data deleted\n');
    }
  }
}

// Run tests
runTests().catch(err => {
  console.error('TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
