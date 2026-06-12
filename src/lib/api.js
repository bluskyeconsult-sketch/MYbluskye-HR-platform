// src/lib/api.js - UNIFIED API CLIENT
// All frontend API calls use this single client
// ODUSBABA API Client v4.0 - Production Ready with Caching & Retry

const API_BASE = '/api/index';

class ODUSABAApi {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
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
    async getRequest(action, params = {}) {
        return this.request(action, { method: 'GET', params });
    }

    // Helper for POST requests
    async postRequest(action, body = {}) {
        return this.request(action, { method: 'POST', body });
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
        return this.getRequest('capabilities');
    }
    
    // ========== JOBS ==========
    async fetchJobs(filters = {}) {
        return this.postRequest('fetchJobs', filters);
    }
    
    async searchJobs(query, filters = {}) {
        return this.postRequest('searchJobs', { query, filters });
    }
    
    async getJobDetails(jobId) {
        return this.getRequest('job-details', { jobId });
    }
    
    async applyForJob(jobId, applicationData) {
        return this.postRequest('apply-job', { jobId, ...applicationData });
    }
    
    async saveJob(jobId) {
        return this.postRequest('save-job', { jobId });
    }
    
    // ========== WORKFORCE ==========
    async getWorkforceSkills(filters = {}) {
        return this.postRequest('getWorkforceSkills', filters);
    }
    
    async submitSkill(skillData) {
        return this.postRequest('submitSkill', skillData);
    }
    
    async contactWorker(workerId, skillId, message, senderName) {
        return this.postRequest('contactWorker', { workerId, skillId, message, senderName });
    }
    
    async hireWorker(workerId, task) {
        return this.postRequest('hire-worker', { workerId, task });
    }
    
    // ========== COURSES ==========
    async getCourses() {
        return this.getRequest('courses-list');
    }
    
    async getCourseDetails(courseId) {
        return this.getRequest('course-details', { courseId });
    }
    
    async enrollInCourse(courseId, userId) {
        return this.postRequest('enroll-course', { courseId, userId });
    }
    
    async updateCourseProgress(courseId, progress, lessonId, userId) {
        return this.postRequest('update-course-progress', { courseId, progress, lessonId, userId });
    }
    
    async getUserEnrollments(userId) {
        return this.getRequest('user-enrollments', { userId });
    }
    
    // ========== ASSESSMENTS ==========
    async getAssessments() {
        return this.getRequest('assessments-list');
    }
    
    async getAssessmentDetails(assessmentId) {
        return this.getRequest('assessment-details', { assessmentId });
    }
    
    async startAssessment(assessmentId, userId) {
        return this.postRequest('start-assessment', { assessmentId, userId });
    }
    
    async submitAssessment(assessmentId, answers, userId) {
        return this.postRequest('submit-assessment', { assessmentId, answers, userId });
    }
    
    async getAssessmentResults(assessmentId, userId) {
        return this.getRequest('assessment-results', { assessmentId, userId });
    }
    
    // ========== HR TOOLS ==========
    async analyzeCV(cvText) {
        return this.postRequest('analyzeCV', { cvText });
    }
    
    async simulateInterview(role, questions) {
        return this.postRequest('simulate-interview', { role, questions });
    }
    
    async checkRights(situation, country) {
        return this.postRequest('checkRights', { situation, country });
    }
    
    async generateGrievance(details) {
        return this.postRequest('generateGrievance', details);
    }
    
    async analyzeContract(contractText) {
        return this.postRequest('analyze-contract', { contractText });
    }
    
    // ========== AI CHAT ==========
    async chat(messages, context = {}) {
        return this.postRequest('chat', { messages, context });
    }
    
    // ========== NEWSLETTER ==========
    async subscribeNewsletter(email, name, preferences) {
        return this.postRequest('newsletterSubscribe', { email, name, preferences });
    }
    
    // ========== VIRTUAL ASSISTANT ==========
    async getVirtualAssistants() {
        return this.getRequest('virtual-assistants');
    }
    
    async executeVATask(vaId, input, userId) {
        return this.postRequest('executeVATask', { vaId, input, userId });
    }
    
    async getVATasks(userId) {
        return this.getRequest('va-tasks', { userId });
    }
    
    async getVACredits(userId) {
        return this.getRequest('va-credits', { userId });
    }
    
    async getTaskHistory(limit = 20) {
        return this.postRequest('task-history', { limit });
    }
    
    // ========== USER & AUTH ==========
    async getUser() {
        return this.getRequest('get-user');
    }
    
    async getUserProfile(userId) {
        return this.getRequest('user-profile', { userId });
    }
    
    async updateUserProfile(userId, updates) {
        return this.postRequest('userUpdate', { userId, updates });
    }
    
    async getUserStats(userId) {
        return this.getRequest('user-stats', { userId });
    }
    
    async getUserApplications(userId) {
        return this.getRequest('user-applications', { userId });
    }
    
    async getUserCapabilities(userId) {
        return this.postRequest('getUserCapabilities', { userId });
    }
    
    // ========== BOOKS ==========
    async getBooks() {
        return this.getRequest('books-list');
    }
    
    async getBookDetails(bookId) {
        return this.getRequest('book-details', { bookId });
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
        return this.getRequest('tester-status', { email });
    }
    
    // ========== SECURITY ==========
    async forceClearAuth() {
        return this.getRequest('force-clear-auth');
    }
    
    async checkDatabase() {
        return this.getRequest('db');
    }
    
    async checkCapability(action, context = {}) {
        return this.postRequest('checkCapability', { action, context });
    }
    
    // ========== CAPABILITIES ==========
    async getApiCapabilities() {
        return this.getRequest('capabilities');
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
