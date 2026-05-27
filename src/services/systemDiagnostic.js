// src/services/systemDiagnostic.js
// Run this to see EXACTLY what's broken

import { supabase } from '../lib/supabase';

export async function runFullDiagnostic() {
  const results = {
    timestamp: new Date().toISOString(),
    database: { status: 'unknown', error: null, tables: {} },
    ai: { status: 'unknown', error: null },
    jobs: { status: 'unknown', error: null },
    assessments: { status: 'unknown', error: null },
    auth: { status: 'unknown', error: null }
  };

  // 1. TEST DATABASE CONNECTION & TABLES
  console.log('🔍 TESTING DATABASE...');
  
  // Test jobs table
  const { data: jobsData, error: jobsError } = await supabase
    .from('jobs')
    .select('count', { count: 'exact', head: true });
  
  results.database.tables.jobs = {
    exists: !jobsError || jobsError.message.includes('relation') === false,
    error: jobsError?.message || null,
    count: jobsData?.count || 0
  };
  
  // Test assessments table
  const { data: assessmentsData, error: assessmentsError } = await supabase
    .from('assessments')
    .select('id, title, question_count')
    .limit(3);
  
  results.database.tables.assessments = {
    exists: !assessmentsError,
    error: assessmentsError?.message || null,
    sampleCount: assessmentsData?.length || 0,
    sample: assessmentsData || []
  };
  
  // Test questions table (critical for assessments)
  const { data: questionsData, error: questionsError } = await supabase
    .from('assessment_questions')
    .select('count', { count: 'exact', head: true });
  
  results.database.tables.assessment_questions = {
    exists: !questionsError,
    error: questionsError?.message || null,
    totalQuestions: questionsData?.count || 0
  };
  
  // Test profiles table
  const { error: profilesError } = await supabase
    .from('profiles')
    .select('count', { count: 'exact', head: true });
  
  results.database.tables.profiles = {
    exists: !profilesError,
    error: profilesError?.message || null
  };

  // 2. TEST AI SERVICE (Direct OpenAI call)
  console.log('🤖 TESTING AI SERVICE...');
  
  try {
    const aiTestResponse = await fetch('/api/test-openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    const aiResult = await aiTestResponse.json();
    results.ai = {
      status: aiTestResponse.ok ? 'working' : 'failed',
      statusCode: aiTestResponse.status,
      response: aiResult,
      error: aiResult.error || null
    };
  } catch (err) {
    results.ai = {
      status: 'error',
      error: err.message,
      tip: 'Check if /api/test-openai endpoint exists'
    };
  }

  // 3. TEST JOB FETCHING
  console.log('💼 TESTING JOB SERVICE...');
  
  const { data: jobs, error: fetchError } = await supabase
    .from('jobs')
    .select('*')
    .limit(5);
  
  results.jobs = {
    canFetch: !fetchError,
    error: fetchError?.message || null,
    sampleCount: jobs?.length || 0,
    sample: jobs || []
  };

  // 4. TEST AUTH
  console.log('🔐 TESTING AUTH...');
  
  const { data: { session } } = await supabase.auth.getSession();
  results.auth = {
    hasSession: !!session,
    userEmail: session?.user?.email || null,
    error: null
  };

  // 5. PRINT FULL REPORT
  console.log('=' .repeat(60));
  console.log('📊 SYSTEM DIAGNOSTIC REPORT');
  console.log('=' .repeat(60));
  console.log(JSON.stringify(results, null, 2));
  
  // 6. RETURN FOR PROGRAMMATIC USE
  return results;
}

// Run this in browser console: 
// import { runFullDiagnostic } from './src/services/systemDiagnostic.js'
// await runFullDiagnostic()
