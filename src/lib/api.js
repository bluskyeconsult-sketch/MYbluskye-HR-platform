// src/lib/api.js - UNIFIED API CLIENT
// All frontend API calls use this single client
// ODUSBABA API Client v4.1 - FIXED action names, auth headers, unimplemented-action guards
//
// FIXES APPLIED (2026-08-07):
// 1. Several methods called action names that don't match any real handler in
//    api/index.js (e.g. 'executeVATask' vs real 'va-execute'). Renamed to match.
// 2. This client never attached an Authorization header, so even methods whose
//    action names DID match (va-tasks, va-credits, user-stats, user-applications,
//    user-update) were failing, because those handlers require a Bearer token.
//    Added getAuthHeaders() and wired it into every method that needs it.
// 3. Several methods call actions with NO corresponding backend handler at all
//    (e.g. applyForJob, saveJob, analyzeCV, submitAssessment). These can't be
//    safely "fixed" without inventing business logic that should come from you.
//    They're now marked with a NOT_IMPLEMENTED guard that throws a clear error
//    instead of silently returning useless metadata. See the project brief's
//    Phase backlog for tracking these.
// 4. chat() now sends the shape the real 'chat' handler expects (single
//    `message` + `history` array) instead of an unsupported `messages` array.
// 5. getAssessmentResults() now sends `id` (what the handler reads) instead of
//    `assessmentId`, and includes the auth header the handler requires.

import { supabase } from './supabase';

const API_BASE = '/api/index';

class ODUSABAApi {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // ========== AUTH HEADER HELPER (NEW) ==========
    // Several real backend handlers (va-tasks, va-credits, user-stats,
    // user-applications, user-update, assessment-results) require a Bearer
    // token and reject requests without one. This was previously never sent.
    async getAuthHeaders() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                return { Authorization: `Bearer ${session.access_token}` };
            }
            return {};
        } catch (error) {
            console.warn('Could not get auth session for API call:', error);
            return {};
        }
    }

    // ========== NOT-IMPLEMENTED GUARD (NEW) ==========
    // For actions with no matching backend handler. Fails clearly and
    // immediately instead of silently hitting the API's "unknown action"
    // fallback (which returns HTTP 200 with useless metadata and no error).
    notImplemented(methodName, actionName) {
        const message = `${methodName}() calls action "${actionName}", which has no backend handler yet in api/index.js. This feature isn't built server-side. See the project brief's phase backlog.`;
        console.error(message);
        return Promise.reject(new Error(message));
    }

    // Helper function to handle API responses
    async handleResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `API request failed: ${response.status}`);
        }
        if (!data.success && data.error) {
            throw new Error(data.error);
        }
        return data;
    }

    // Retry logic for failed requests
    async retryRequest(fn, retries = this.maxRetries) {
        try {
            return await fn();
        } catch (error) {
            if (retries <= 0) throw error;
            if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * (this.maxRetries - retries + 1)));
                return this.retryRequest(fn, retries - 1);
            }
            throw error;
        }
    }

    // Core request method with caching and deduplication
    async request(action, options = {}) {
        const cacheKey = `${action}_${JSON.stringify(options.body || {})}_${options.method || 'POST'}`;
        
        // Return cached response if available and not expired (only for GET)
        const isGet = (options.method === 'GET' || (!options.method && !options.body));
        
        if (isGet && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 30000) { // 30 second cache for GET requests
                return cached.data;
            }
            // Clear expired cache
            this.cache.delete(cacheKey);
        }
        
        // Prevent duplicate in-flight requests
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }
        
        const method = options.method || (options.body ? 'POST' : 'GET');
        let url = `${API_BASE}?action=${action}`;
        
        // Handle GET requests with query parameters
        if (method === 'GET' && options.params) {
            const queryParams = new URLSearchParams(options.params).toString();
            if (queryParams) url += `&${queryParams}`;
        }
        
        const promise = this.retryRequest(async () => {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });
            
            const data = await this.handleResponse(response);
            
            // Cache successful GET responses
            if (isGet) {
                this.cache.set(cacheKey, { data, timestamp: Date.now() });
                // Clear cache after 30 seconds
                setTimeout(() => this.cache.delete(cacheKey), 30000);
            }
            
            return data;
        }).catch(error => {
            console.error(`API Error (${action}):`, error);
            throw error;
        }).finally(() => {
            this.pendingRequests.delete(cacheKey);
        });
        
        this.pendingRequests.set(cacheKey, promise);
        return promise;
    }

    // Helper for GET requests
    async getRequest(action, params = {}, extraHeaders = {}) {
        return this.request(action, { method: 'GET', params, headers: extraHeaders });
    }

    // Helper for POST requests
    async postRequest(action, body = {}, extraHeaders = {}) {
        return this.request(action, { method: 'POST', body, headers: extraHeaders });
    }

    // ========== HEALTH & SYSTEM ==========
    async health() {
        return this.getRequest('health');
    }
    
    async ping() {
        return this.getRequest('ping');
    }
    
    async getIp() {
        return this.getRequest('ip');
    }
    
    async getCapabilities() {
        // NOT IMPLEMENTED SERVER-SIDE: no 'capabilities' handler exists.
        // Tier/capability info actually comes from GovernanceContext.jsx, not this API.
        return this.notImplemented('getCapabilities', 'capabilities');
    }
    
    // ========== JOBS ==========
    async fetchJobs(filters = {}) {
        // FIXED: was calling nonexistent 'fetchJobs' action. Real handler is 'jobs'.
        // NOTE: the real 'jobs' handler ignores any filters passed to it — it always
        // fetches the same external sources and returns everything. Filtering must
        // currently happen client-side after the response comes back.
        if (Object.keys(filters).length > 0) {
            console.warn('fetchJobs(): filters are not supported server-side yet; results are unfiltered.');
        }
        return this.getRequest('jobs');
    }
    
    async searchJobs(query, filters = {}) {
        // NOT IMPLEMENTED SERVER-SIDE: no 'searchJobs' handler exists.
        return this.notImplemented('searchJobs', 'searchJobs');
    }
    
    async getJobDetails(jobId) {
        // NOT IMPLEMENTED SERVER-SIDE: no 'job-details' handler exists.
        return this.notImplemented('getJobDetails', 'job-details');
    }
    
    async applyForJob(jobId, applicationData) {
        // NOT IMPLEMENTED SERVER-SIDE: no 'apply-job' handler exists.
        // Job applications currently need to be inserted directly via Supabase
        // (see how JobsPage.jsx handles saved_jobs for the working pattern).
        return this.notImplemented('applyForJob', 'apply-job');
    }
    
    async saveJob(jobId) {
        // NOT IMPLEMENTED SERVER-SIDE: no 'save-job' handler exists.
        // JobsPage.jsx already does this correctly via a direct Supabase insert
        // into saved_jobs — use that pattern instead of this method.
        return this.notImplemented('saveJob', 'save-job');
    }
    
    // ========== WORKFORCE ==========
    async getWorkforceSkills(filters = {}) {
        return this.notImplemented('getWorkforceSkills', 'getWorkforceSkills');
    }
    
    async submitSkill(skillData) {
        return this.notImplemented('submitSkill', 'submitSkill');
    }
    
    async contactWorker(workerId, skillId, message, senderName) {
        return this.notImplemented('contactWorker', 'contactWorker');
    }
    
    async hireWorker(workerId, task) {
        return this.notImplemented('hireWorker', 'hire-worker');
    }
    
    // ========== COURSES ==========
    async getCourses() {
        return this.getRequest('courses-list');
    }
    
    async getCourseDetails(courseId) {
        return this.notImplemented('getCourseDetails', 'course-details');
    }
    
    async enrollInCourse(courseId, userId) {
        // FIXED (2026-08-28): missing-auth-header regression - enroll-course
        // now requires a matching real token.
        const headers = await this.getAuthHeaders();
        return this.postRequest('enroll-course', { courseId, userId }, headers);
    }
    
    async updateCourseProgress(courseId, progress, lessonId, userId) {
        // FIXED (2026-08-28): same regression - update-course-progress now
        // requires a matching real token.
        const headers = await this.getAuthHeaders();
        return this.postRequest('update-course-progress', { courseId, progress, lessonId, userId }, headers);
    }
    
    async getUserEnrollments(userId) {
        return this.notImplemented('getUserEnrollments', 'user-enrollments');
    }
    
    // ========== ASSESSMENTS ==========
    async getAssessments() {
        return this.getRequest('assessments-list');
    }
    
    async getAssessmentDetails(assessmentId) {
        return this.notImplemented('getAssessmentDetails', 'assessment-details');
    }
    
    async startAssessment(assessmentId, userId) {
        return this.notImplemented('startAssessment', 'start-assessment');
    }
    
    async submitAssessment(assessmentId, answers, userId) {
        return this.notImplemented('submitAssessment', 'submit-assessment');
    }
    
    async getAssessmentResults(assessmentId, userId) {
        // FIXED: real handler reads `id` from the query string (not `assessmentId`),
        // derives the user from the Authorization header (not a passed userId),
        // and requires that header to be present at all.
        const headers = await this.getAuthHeaders();
        return this.getRequest('assessment-results', { id: assessmentId }, headers);
    }
    
    // ========== HR TOOLS ==========
    // FIXED (2026-08-08): all 5 of these were stubs that always rejected —
    // the entire HR Tools page has shown a raw technical error message to
    // every user for every tool since it was built. Now call real backend
    // actions, added to api/index.js alongside this fix.
    //
    // FIXED (2026-08-28): a separate, more recent backend security fix
    // (closing a real userId-impersonation gap across ~30 handlers) now
    // requires a matching, real Authorization header whenever a userId is
    // sent - none of these 10 methods ever attached one, even though this
    // file's own header claims auth headers were wired in "everywhere
    // needed." That claim was true at the time it was written (before the
    // security fix existed) and has been stale since - every one of these
    // 10 tools has been failing with 401 for every real, logged-in user.
    // UPDATED (2026-08-30): added an optional targetRole parameter for
    // real, role-specific ATS and keyword feedback - defaults to null so
    // every existing call site (which only ever passed cvText and
    // userId) continues to work exactly as before.
    async analyzeCV(cvText, userId, targetRole = null) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('analyzeCV', { cvText, userId, targetRole }, headers);
    }
    
    // UPDATED (2026-08-30): added optional userAnswer/currentQuestion
    // params for real answer evaluation - default to null so any
    // existing call (question-generation only) works exactly as before.
    async simulateInterview(role, questions, userId, userAnswer = null, currentQuestion = null) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('simulate-interview', { role, questions, userId, userAnswer, currentQuestion }, headers);
    }
    
    async checkRights(situation, country, userId) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('checkRights', { situation, country, userId }, headers);
    }
    
    async generateGrievance(details) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('generateGrievance', details, headers);
    }
    
    async analyzeContract(contractText, userId) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('analyze-contract', { contractText, userId }, headers);
    }
    
    // NEW (2026-08-08): HRToolsPage.jsx's salary calculator previously
    // called analyzeCV as an explicit placeholder ("// For salary
    // calculator, use a more structured approach... Placeholder"). Given a
    // real backend action, so it now does what it's supposed to.
    async calculateSalary(details) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('calculate-salary', details, headers);
    }

    // NEW (2026-08-16): 4 HR Tools expansion methods.
    async generateCoverLetter(details) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('generate-cover-letter', details, headers);
    }

    async optimizeLinkedIn(details) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('optimize-linkedin', details, headers);
    }

    async writeJobDescription(details) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('write-job-description', details, headers);
    }

    async writePerformanceReview(details) {
        const headers = await this.getAuthHeaders();
        return this.postRequest('write-performance-review', details, headers);
    }
    
    // ========== AI CHAT ==========
    async chat(messages, context = {}) {
        // FIXED: real handler expects a single `message` string plus a `history`
        // array, not a `messages` array + `context` object. Reshaping here so
        // existing callers of chat(messages, context) don't need to change.
        //
        // FIXED (2026-08-28): same missing-auth-header regression as the
        // HR Tools above - the chat handler now requires a matching real
        // token whenever userId is present in the request.
        const history = Array.isArray(messages) ? messages.slice(0, -1) : [];
        const lastMessage = Array.isArray(messages) && messages.length > 0
            ? messages[messages.length - 1]?.content ?? String(messages[messages.length - 1])
            : String(messages);
        
        const headers = await this.getAuthHeaders();
        return this.postRequest('chat', {
            message: lastMessage,
            history,
            systemPrompt: context.systemPrompt,
            temperature: context.temperature,
            maxTokens: context.maxTokens,
            userId: context.userId
        }, headers);
    }
    
    // ========== NEWSLETTER ==========
    async subscribeNewsletter(email, name, preferences) {
        // FIXED: real handler is 'newsletter-subscribe', not 'newsletterSubscribe'.
        // NOTE: the handler currently ignores `preferences` — only email/name are stored.
        return this.postRequest('newsletter-subscribe', { email, name });
    }
    
    // ========== VIRTUAL ASSISTANT ==========
    async getVirtualAssistants() {
        return this.getRequest('virtual-assistants');
    }
    
    async executeVATask(vaId, input, userId) {
        // FIXED: real handler is 'va-execute', not 'executeVATask', and expects
        // the field named `assistantId`, not `vaId`.
        // NOTE (see project brief): this handler currently returns hardcoded
        // template text per assistant type, not a real OpenAI call — flagged
        // separately for clarification, not something this client fix changes.
        // FIXED (2026-08-28): same missing-auth-header regression - va-execute
        // is credit-metered and now requires a matching real token.
        const headers = await this.getAuthHeaders();
        return this.postRequest('va-execute', { assistantId: vaId, input, userId }, headers);
    }
    
    async getVATasks(userId) {
        // FIXED: added required Authorization header (handler rejects requests without it).
        const headers = await this.getAuthHeaders();
        return this.getRequest('va-tasks', { userId }, headers);
    }
    
    async getVACredits(userId) {
        // FIXED: added required Authorization header (handler rejects requests without it).
        const headers = await this.getAuthHeaders();
        return this.getRequest('va-credits', { userId }, headers);
    }
    
    async getTaskHistory(limit = 20) {
        return this.notImplemented('getTaskHistory', 'task-history');
    }
    
    // ========== USER & AUTH ==========
    async getUser() {
        // NOT IMPLEMENTED SERVER-SIDE, and not needed: use getCurrentUser()
        // from lib/supabase.js instead, which already works correctly.
        return this.notImplemented('getUser', 'get-user');
    }
    
    async getUserProfile(userId) {
        return this.notImplemented('getUserProfile', 'user-profile');
    }
    
    async updateUserProfile(userId, updates) {
        // FIXED: real handler is 'user-update', not 'userUpdate', and requires
        // the Authorization header (handler also checks the token's user matches userId).
        const headers = await this.getAuthHeaders();
        return this.postRequest('user-update', { userId, updates }, headers);
    }
    
    async getUserStats(userId) {
        // FIXED: added required Authorization header (handler rejects requests without it).
        const headers = await this.getAuthHeaders();
        return this.getRequest('user-stats', { userId }, headers);
    }
    
    async getUserApplications(userId) {
        // FIXED: added required Authorization header (handler rejects requests without it).
        const headers = await this.getAuthHeaders();
        return this.getRequest('user-applications', { userId }, headers);
    }
    
    async getUserCapabilities(userId) {
        return this.notImplemented('getUserCapabilities', 'getUserCapabilities');
    }
    
    // ========== BOOKS ==========
    async getBooks() {
        return this.getRequest('books-list');
    }
    
    async getBookDetails(bookId) {
        return this.notImplemented('getBookDetails', 'book-details');
    }
    
    // ========== ARTICLES ==========
    async getArticles() {
        return this.getRequest('articles-list');
    }
    
    async getArticleBySlug(slug) {
        return this.getRequest('article', { slug });
    }
    
    // ========== ANALYTICS ==========
    async trackEvent(eventType, eventData, userId = null) {
        return this.postRequest('track-event', { event_type: eventType, event_data: eventData, user_id: userId });
    }
    
    // ========== TESTER PROGRAM ==========
    async createTester(email, name, uses = 10, days = 30) {
        return this.postRequest('tester-create', { email, name, uses, days });
    }
    
    async getTesterStatus(email) {
        return this.notImplemented('getTesterStatus', 'tester-status');
    }
    
    // ========== SECURITY ==========
    async forceClearAuth() {
        return this.getRequest('force-clear-auth');
    }
    
    async checkDatabase() {
        return this.getRequest('db');
    }
    
    async checkCapability(action, context = {}) {
        return this.notImplemented('checkCapability', 'checkCapability');
    }
    
    // ========== CAPABILITIES ==========
    async getApiCapabilities() {
        return this.notImplemented('getApiCapabilities', 'capabilities');
    }
    
    // Clear cache for specific action or all
    clearCache(action = null) {
        if (action) {
            for (const key of this.cache.keys()) {
                if (key.startsWith(action)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }
}

// Create and export singleton instance
export const api = new ODUSABAApi();

// Default export for convenience
export default api;
