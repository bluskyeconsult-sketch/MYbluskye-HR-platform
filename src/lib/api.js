// src/lib/api.js - UNIFIED API CLIENT
// All frontend API calls use this single client
// ODUSBABA API Client v2.0 - Production Ready

const API_BASE = '/api/index';

// Helper function to handle API responses
async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `API request failed: ${response.status}`);
    }
    if (!data.success && data.error) {
        throw new Error(data.error);
    }
    return data;
}

// Helper for POST requests
async function postRequest(action, body) {
    const response = await fetch(`${API_BASE}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return handleResponse(response);
}

// Helper for GET requests
async function getRequest(action, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_BASE}?action=${action}${queryParams ? `&${queryParams}` : ''}`;
    const response = await fetch(url);
    return handleResponse(response);
}

export const api = {
    // ========== HEALTH & SYSTEM ==========
    health: async () => {
        return getRequest('health');
    },
    
    ping: async () => {
        return getRequest('ping');
    },
    
    getIp: async () => {
        return getRequest('ip');
    },
    
    getCapabilities: async () => {
        return getRequest('capabilities');
    },
    
    // ========== JOBS ==========
    fetchJobs: async () => {
        return getRequest('jobs');
    },
    
    getJobDetails: async (jobId) => {
        return getRequest('job-details', { jobId });
    },
    
    applyForJob: async (jobId, applicationData) => {
        return postRequest('apply-job', { jobId, ...applicationData });
    },
    
    // ========== WORKFORCE ==========
    getWorkforceSkills: async () => {
        return getRequest('workforce-skills');
    },
    
    submitSkill: async (skillData) => {
        return postRequest('submit-skill', skillData);
    },
    
    contactWorker: async (workerId, message) => {
        return postRequest('contact-worker', { workerId, message });
    },
    
    // ========== COURSES ==========
    getCourses: async () => {
        return getRequest('courses-list');
    },
    
    getCourseDetails: async (courseId) => {
        return getRequest('course-details', { courseId });
    },
    
    enrollInCourse: async (courseId, userId) => {
        return postRequest('enroll-course', { courseId, userId });
    },
    
    updateCourseProgress: async (courseId, progress, lessonId, userId) => {
        return postRequest('update-course-progress', { courseId, progress, lessonId, userId });
    },
    
    getUserEnrollments: async (userId) => {
        return getRequest('user-enrollments', { userId });
    },
    
    // ========== ASSESSMENTS ==========
    getAssessments: async () => {
        return getRequest('assessments-list');
    },
    
    getAssessmentDetails: async (assessmentId) => {
        return getRequest('assessment-details', { assessmentId });
    },
    
    startAssessment: async (assessmentId, userId) => {
        return postRequest('start-assessment', { assessmentId, userId });
    },
    
    submitAssessment: async (assessmentId, answers, userId) => {
        return postRequest('submit-assessment', { assessmentId, answers, userId });
    },
    
    getAssessmentResults: async (assessmentId, userId) => {
        return getRequest('assessment-results', { assessmentId, userId });
    },
    
    // ========== HR TOOLS ==========
    analyzeCV: async (cvText) => {
        return postRequest('analyze-cv', { cvText });
    },
    
    checkRights: async (situation, country) => {
        return postRequest('check-rights', { situation, country });
    },
    
    generateGrievance: async (details) => {
        return postRequest('generate-grievance', details);
    },
    
    // ========== AI CHAT ==========
    chat: async (messages, context = {}) => {
        return postRequest('chat', { messages, context });
    },
    
    // ========== NEWSLETTER ==========
    subscribeNewsletter: async (email, name, preferences) => {
        return postRequest('newsletter-subscribe', { email, name, preferences });
    },
    
    // ========== VIRTUAL ASSISTANT ==========
    executeVATask: async (vaId, input, userId) => {
        return postRequest('va-execute', { vaId, input, userId });
    },
    
    getVATasks: async (userId) => {
        return getRequest('va-tasks', { userId });
    },
    
    getVACredits: async (userId) => {
        return getRequest('va-credits', { userId });
    },
    
    // ========== USER & AUTH ==========
    getUserProfile: async (userId) => {
        return getRequest('user-profile', { userId });
    },
    
    updateUserProfile: async (userId, updates) => {
        return postRequest('user-update', { userId, updates });
    },
    
    getUserStats: async (userId) => {
        return getRequest('user-stats', { userId });
    },
    
    getUserApplications: async (userId) => {
        return getRequest('user-applications', { userId });
    },
    
    // ========== BOOKS ==========
    getBooks: async () => {
        return getRequest('books-list');
    },
    
    getBookDetails: async (bookId) => {
        return getRequest('book-details', { bookId });
    },
    
    // ========== ARTICLES ==========
    getArticles: async () => {
        return getRequest('articles-list');
    },
    
    getArticleBySlug: async (slug) => {
        return getRequest('article', { slug });
    },
    
    // ========== ANALYTICS ==========
    trackEvent: async (eventType, eventData, userId = null) => {
        return postRequest('track-event', { event_type: eventType, event_data: eventData, user_id: userId });
    },
    
    // ========== TESTER PROGRAM ==========
    createTester: async (email, name, uses = 10, days = 30) => {
        return postRequest('tester-create', { email, name, uses, days });
    },
    
    getTesterStatus: async (email) => {
        return getRequest('tester-status', { email });
    },
    
    // ========== SECURITY ==========
    forceClearAuth: async () => {
        return getRequest('force-clear-auth');
    },
    
    checkDatabase: async () => {
        return getRequest('db');
    },
    
    // ========== CAPABILITIES ==========
    getApiCapabilities: async () => {
        return getRequest('capabilities');
    }
};

// Default export for convenience
export default api;
