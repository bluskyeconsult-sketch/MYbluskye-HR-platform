// src/services/appraisalApi.js
// NEW (2026-10-23): one small client for the appraisal and compliance endpoints.
// Every call goes through the server, which decides who may see what. Nothing here is trusted for security.
import { supabase } from '../lib/supabase';

export async function apiCall(action, body = {}, { auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        else if (auth === 'required') throw Object.assign(new Error('Please sign in.'), { status: 401 });
    }
    const res = await fetch(`/api/index?action=${action}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
        throw Object.assign(new Error(json.error || 'Something went wrong. Please try again.'), { status: res.status, code: json.code, gate: json.gate, data: json });
    }
    return json;
}

export const STATUS_LABELS = {
    awaiting_self: 'Waiting for self-appraisal',
    awaiting_supervisor: 'Waiting for supervisor',
    awaiting_employee_response: 'Waiting for employee response',
    meeting_required: 'Discussion meeting needed',
    meeting_scheduled: 'Meeting scheduled',
    awaiting_joint_record: 'Waiting for joint record',
    escalated_disagreement: 'Disagreement: approver to decide',
    awaiting_final_approval: 'Waiting for final approval',
    returned_to_supervisor: 'Returned to supervisor',
    filed: 'Filed',
    closed_employee_left: 'Closed (employee left)',
    withdrawn: 'Withdrawn',
    purged: 'Deleted after retention period'
};

export const ACTION_LABELS = {
    complete_self: 'Complete your self-appraisal',
    complete_supervisor: 'Complete your assessment',
    give_input: 'Give your input',
    respond: 'Read and respond',
    propose_meeting: 'Propose meeting times',
    choose_slot: 'Choose a meeting time',
    hold_meeting: 'Mark meeting as held',
    record_joint: 'Record the joint appraisal',
    final_decision: 'Make the final decision',
    reassign: 'Choose a new supervisor'
};

export const SERVICE_LABELS = { appraisal: 'Staff appraisals', appraisal_ai: 'AI help with appraisals', appraisal_analytics: 'Appraisal reports', paid_services: 'Paid services', ai_services: 'AI services', workforce: 'Workforce marketplace' };
