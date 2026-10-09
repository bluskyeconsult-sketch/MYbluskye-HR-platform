// src/services/systemDiagnostic.js
// REWRITTEN (2026-10-09). The old version could not work:
//  - it read row counts from `data.count`, but Supabase returns the count
//    on the response itself (`count`), so every count showed 0;
//  - it called /api/test-openai, which does not exist (the site has one
//    router, /api/index?action=...);
//  - it pulled full rows (select('*')) from jobs into the console report.
// This version uses the real endpoints and prints only counts and statuses.
// Nothing here modifies data. Run from the browser console while signed in:
//   const { runFullDiagnostic } = await import('/src/services/systemDiagnostic.js');
//   await runFullDiagnostic();
// (For routine use, Admin -> Diagnostics -> "Run Diagnostics" is simpler.)

import { supabase } from '../lib/supabase';

async function countRows(table) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  return { exists: !error, count: error ? null : (count ?? 0), error: error?.message || null };
}

export async function runFullDiagnostic() {
  const results = {
    timestamp: new Date().toISOString(),
    database: { tables: {} },
    config: { status: 'unknown', error: null },
    server: { status: 'unknown', error: null },
    auth: { hasSession: false, userEmail: null }
  };

  // 1. Database tables (counts only)
  for (const table of ['profiles', 'jobs', 'assessments', 'assessment_questions']) {
    results.database.tables[table] = await countRows(table);
  }

  // 2. Server configuration (OpenAI key, email, etc.) via the real endpoint
  try {
    const res = await fetch('/api/index?action=system-config-health');
    const body = await res.json();
    results.config = { status: res.ok && body.success ? 'ok' : 'failed', statusCode: res.status, detail: body };
  } catch (err) {
    results.config = { status: 'error', error: err.message };
  }

  // 3. Auth state, then the admin-only server diagnostics if signed in
  const { data: { session } } = await supabase.auth.getSession();
  results.auth = { hasSession: !!session, userEmail: session?.user?.email || null };

  if (session?.access_token) {
    try {
      const res = await fetch('/api/index?action=run-diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
      });
      const body = await res.json();
      results.server = res.ok && body.success
        ? { status: body.healthy ? 'healthy' : 'issues', checks: body.checks }
        : { status: 'failed', statusCode: res.status, error: body.error || null };
    } catch (err) {
      results.server = { status: 'error', error: err.message };
    }
  } else {
    results.server = { status: 'skipped', error: 'Sign in as an admin to run the server checks.' };
  }

  console.log(JSON.stringify(results, null, 2));
  return results;
}
