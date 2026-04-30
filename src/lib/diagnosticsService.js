import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function runDiagnostics() {
    const results = { healthy: true, checks: [], timestamp: new Date().toISOString() };
    
    try {
        const start = Date.now();
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        results.checks.push({ name: 'Database Connection', status: error ? 'failed' : 'passed', responseTime: Date.now() - start, error: error?.message });
        if (error) results.healthy = false;
    } catch(e) { results.checks.push({ name: 'Database Connection', status: 'failed', error: e.message }); results.healthy = false; }
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        results.checks.push({ name: 'Authentication', status: session ? 'passed' : 'warning' });
    } catch(e) { results.checks.push({ name: 'Authentication', status: 'failed', error: e.message }); results.healthy = false; }
    
    await supabase.from('diagnostic_logs').insert({ check_type: 'system_diagnostics', status: results.healthy ? 'healthy' : 'degraded', metadata: results });
    return results;
}

export async function selfHeal() {
    const issues = [], fixes = [];
    
    const { data: orphaned } = await supabase.from('profiles').select('id').not('id', 'in', (await supabase.from('auth.users').select('id')).data?.map(u => u.id) || []);
    if (orphaned?.length > 0) { issues.push(`${orphaned.length} orphaned profiles`); await supabase.from('profiles').delete().in('id', orphaned.map(p => p.id)); fixes.push(`Deleted ${orphaned.length} profiles`); }
    
    const { data: expiredTesters } = await supabase.from('profiles').select('id').eq('user_type', 'tester').lt('tester_expires_at', new Date().toISOString());
    if (expiredTesters?.length > 0) { issues.push(`${expiredTesters.length} expired testers`); await supabase.from('profiles').update({ user_type: 'registered', is_tester: false }).in('id', expiredTesters.map(t => t.id)); fixes.push(`Converted ${expiredTesters.length} testers`); }
    
    await supabase.from('diagnostic_logs').insert({ check_type: 'self_heal', status: fixes.length > 0 ? 'issues_fixed' : 'healthy', metadata: { issues, fixes } });
    return { issues, fixes };
}

if (typeof window !== 'undefined') { runDiagnostics(); setInterval(async () => { await runDiagnostics(); await selfHeal(); }, 60 * 60 * 1000); }
