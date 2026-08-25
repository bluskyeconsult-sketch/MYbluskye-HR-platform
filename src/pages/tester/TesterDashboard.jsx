// src/pages/tester/TesterDashboard.jsx
//
// FIXED (2026-08-23):
// 1. Disconnected Supabase client (createClient() directly) — same
//    anti-pattern found and fixed repeatedly this session. Now uses the
//    shared singleton.
// 2. "Submit Feedback" button had no onClick handler at all — a
//    completely decorative button that did nothing when clicked, exactly
//    the "looks complete but isn't" pattern this whole project has been
//    hunting down. Wired to a real textarea + submission, writing to a
//    tester_feedback table.
//
// FLAGGED, NOT CONFIRMED: this feedback write assumes a tester_feedback
// table with (user_id, feedback_text, created_at) columns — I don't have
// AdminTesterFeedback.jsx (the admin page that presumably reads this
// back) to confirm it expects the same shape. If that page reads from a
// differently-named table or different columns, this write and that
// read won't connect, the same way several other "two sides never
// actually matched" bugs were found and fixed this session. Send
// AdminTesterFeedback.jsx to confirm/align this properly.
//
// ALSO FLAGGED: getTesterStatus() lives in ../../services/testerService,
// a file not reviewed this session. Its shape (remainingUses,
// allocatedUses, daysRemaining, isActive) looks consistent with the real
// tester_allocations table this session built (remaining_uses,
// allocated_uses, expires_at, status), but this hasn't been directly
// confirmed against that file's actual content.

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getTesterStatus } from '../../services/testerService';

export default function TesterDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const testerStatus = await getTesterStatus(user.id);
      setStatus(testerStatus);
    }
    setLoading(false);
  }

  async function handleSubmitFeedback() {
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { error } = await supabase
        .from('tester_feedback')
        .insert({
          user_id: user.id,
          feedback_text: feedbackText.trim(),
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      setFeedbackSubmitted(true);
      setFeedbackText('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setFeedbackError('Unable to submit feedback right now. Please try again shortly.');
    } finally {
      setSubmittingFeedback(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Tester Dashboard</h1>
        <p className="text-slate-400 mb-8">Thank you for helping us improve the platform</p>
        
        {status?.isActive ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4"><span className="text-white">Remaining Uses</span><span className="text-2xl font-bold text-emerald-400">{status.remainingUses} / {status.allocatedUses}</span></div>
            <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(status.remainingUses / status.allocatedUses) * 100}%` }}></div></div>
            <div className="mt-4 text-center"><p className="text-slate-400">Expires in {status.daysRemaining} days</p></div>
          </div>
        ) : (<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center"><p className="text-red-400">Your tester account has expired. Thank you for your participation!</p></div>)}
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Feedback Form</h2>
          {feedbackSubmitted ? (
            <p className="text-emerald-400">Thanks — your feedback has been recorded.</p>
          ) : (
            <>
              <p className="text-slate-400 mb-3">Share your experience to help us improve.</p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={4}
                placeholder="What's working well? What's confusing or broken?"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-3"
              />
              {feedbackError && <p className="text-red-400 text-sm mb-3">{feedbackError}</p>}
              <button
                onClick={handleSubmitFeedback}
                disabled={submittingFeedback || !feedbackText.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
