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
//
// NEW (2026-08-24): real, structured Test Checklist — replaces "leave a
// paragraph of general feedback" with actual per-task pass/fail/notes,
// grouped by site section, so admins can see exactly which specific page
// or flow broke, for whom, rather than inferring it from free text. The
// task list itself lives in the database (test_checklist_items),
// editable by admins without a code deploy.

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getTesterStatus } from '../../services/testerService';

const API_BASE = '/api/index';

export default function TesterDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const [savingItemId, setSavingItemId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

  useEffect(() => {
    loadStatus();
    loadChecklist();
  }, []);

  async function loadStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const testerStatus = await getTesterStatus(user.id);
      setStatus(testerStatus);
    }
    setLoading(false);
  }

  async function loadChecklist() {
    setChecklistLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE}?action=get-test-checklist`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const result = await response.json();
      if (result.success) {
        setChecklistItems(result.items);
        const initialSection = result.items[0]?.section;
        if (initialSection) setExpandedSection(initialSection);
      }
    } catch (err) {
      console.error('Error loading test checklist:', err);
    } finally {
      setChecklistLoading(false);
    }
  }

  async function submitTaskResult(itemId, taskStatus) {
    setSavingItemId(itemId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE}?action=submit-test-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          checklistItemId: itemId,
          status: taskStatus,
          notes: noteDrafts[itemId] || null
        })
      });
      const result = await response.json();
      if (result.success) {
        setChecklistItems(prev => prev.map(item =>
          item.id === itemId
            ? { ...item, myResult: { status: taskStatus, notes: noteDrafts[itemId] || null } }
            : item
        ));
      }
    } catch (err) {
      console.error('Error submitting test result:', err);
    } finally {
      setSavingItemId(null);
    }
  }

  const sections = [...new Set(checklistItems.map(i => i.section))];
  const completedCount = checklistItems.filter(i => i.myResult).length;
  const totalCount = checklistItems.length;

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

        {/* NEW (2026-08-24): the real, structured test checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">Test Checklist</h2>
            {totalCount > 0 && (
              <span className="text-sm text-slate-400">{completedCount} / {totalCount} tasks recorded</span>
            )}
          </div>
          <p className="text-slate-400 mb-4 text-sm">
            Work through each section, try the task as described, then mark it Pass, Fail, or Skip. Add a note for anything that seemed off — your feedback is saved automatically, task by task.
          </p>

          {checklistLoading ? (
            <p className="text-slate-500 text-sm">Loading checklist...</p>
          ) : sections.length === 0 ? (
            <p className="text-slate-500 text-sm">No checklist tasks available yet.</p>
          ) : (
            <div className="space-y-2">
              {sections.map(section => {
                const sectionItems = checklistItems.filter(i => i.section === section);
                const sectionDone = sectionItems.filter(i => i.myResult).length;
                const isExpanded = expandedSection === section;
                return (
                  <div key={section} className="border border-slate-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800 transition text-left"
                    >
                      <span className="text-white font-medium">{section}</span>
                      <span className="text-xs text-slate-400">{sectionDone}/{sectionItems.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-slate-800">
                        {sectionItems.map(item => (
                          <div key={item.id} className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <p className="text-white text-sm font-medium">{item.title}</p>
                                {item.description && <p className="text-slate-400 text-xs mt-1">{item.description}</p>}
                                {item.page_path && (
                                  <a href={item.page_path} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-xs hover:underline mt-1 inline-block">
                                    Go to page →
                                  </a>
                                )}
                              </div>
                            </div>
                            <textarea
                              value={noteDrafts[item.id] ?? item.myResult?.notes ?? ''}
                              onChange={(e) => setNoteDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Optional note — what happened?"
                              rows={2}
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none mb-2"
                            />
                            <div className="flex gap-2">
                              {['pass', 'fail', 'skip'].map(s => (
                                <button
                                  key={s}
                                  onClick={() => submitTaskResult(item.id, s)}
                                  disabled={savingItemId === item.id}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition disabled:opacity-50 ${
                                    item.myResult?.status === s
                                      ? s === 'pass' ? 'bg-emerald-600 text-white' : s === 'fail' ? 'bg-red-600 text-white' : 'bg-slate-600 text-white'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
