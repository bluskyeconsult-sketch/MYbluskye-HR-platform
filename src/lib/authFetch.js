// src/lib/authFetch.js
// NEW (2026-08-28) — built after tracing a real, serious regression that
// spread across at least 9 files: a backend security fix (closing a
// userId-impersonation gap) started requiring a matching, real
// Authorization header whenever a userId is claimed, but no one file
// change updated every frontend caller to actually send one. Each was
// found and fixed individually, file by file, only after users reported
// broken payments, broken chat, broken enrollment, and more.
//
// This exists so that class of bug becomes structurally difficult to
// reintroduce, rather than something that has to be re-audited by hand
// every time a backend handler's auth requirements change. Any new code
// that needs to call a backend action should use this instead of a raw
// fetch() with a manually-assembled headers object.
//
// USAGE:
//   import { authenticatedFetch } from '../lib/authFetch';
//   const data = await authenticatedFetch('chat', { message, userId });
//   // Throws with a real, useful error message on failure - no need to
//   // separately check response.ok or data.success in most callers.
//
// For callers that want the raw Response instead of pre-parsed,
// error-checked data (e.g. to inspect status codes themselves):
//   const response = await authenticatedFetchRaw('some-action', body);

import { supabase } from './supabase';

const API_BASE = '/api/index';

// Real, actual auth headers - always fetches the current session fresh
// rather than trusting a cached or passed-in token, since tokens expire
// and the person may have signed in/out since the last call. Returns an
// empty object (not an error) when there's no session - guests correctly
// remain guests, this never forces authentication that wasn't already
// there.
async function getAuthHeader() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
    } catch (err) {
        console.warn('authFetch: could not get session, proceeding as guest:', err.message);
        return {};
    }
}

// Raw version - returns the Response object itself, letting the caller
// handle status codes, .json() parsing, and success/error checking
// however that specific call site needs to. Matches the pattern most of
// the files fixed for this regression already used.
export async function authenticatedFetchRaw(action, body = null, options = {}) {
    const authHeader = await getAuthHeader();
    const method = options.method || (body ? 'POST' : 'GET');

    return fetch(`${API_BASE}?action=${action}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...authHeader,
            ...options.headers
        },
        body: method === 'GET' ? undefined : JSON.stringify(body || {})
    });
}

// Convenience version - parses the response, throws a real, specific
// Error on failure (matching the pattern api.js's handleResponse()
// already uses), and returns the parsed data on success. Most call
// sites want this rather than handling response.ok/data.success
// themselves every time.
export async function authenticatedFetch(action, body = null, options = {}) {
    const response = await authenticatedFetchRaw(action, body, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
    }
    if (data.success === false && data.error) {
        throw new Error(data.error);
    }

    return data;
}
