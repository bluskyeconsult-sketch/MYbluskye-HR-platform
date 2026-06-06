// src/lib/api.js - UNIFIED API CLIENT
// All frontend API calls use this single client

const API_BASE = '/api/index';

export const api = {
    // Health check
    health: async () => {
        const response = await fetch(`${API_BASE}?action=health`);
        return response.json();
    },
    
    // Get IP address
    getIp: async () => {
        const response = await fetch(`${API_BASE}?action=getIp`);
        return response.json();
    },
    
    // Fetch jobs
    fetchJobs: async () => {
        const response = await fetch(`${API_BASE}?action=fetchJobs`);
        return response.json();
    },
    
    // Newsletter subscription
    subscribeNewsletter: async (email, name, preferences) => {
        const response = await fetch(`${API_BASE}?action=newsletterSubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, preferences })
        });
        return response.json();
    },
    
    // Update user profile
    updateUser: async (userId, updates) => {
        const response = await fetch(`${API_BASE}?action=userUpdate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, updates })
        });
        return response.json();
    },
    
    // Enroll in course
    enrollCourse: async (userId, courseId) => {
        const response = await fetch(`${API_BASE}?action=enrollCourse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, courseId })
        });
        return response.json();
    },
    
    // Update course progress
    updateCourseProgress: async (userId, courseId, progress, lessonId) => {
        const response = await fetch(`${API_BASE}?action=updateCourseProgress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, courseId, progress, lessonId })
        });
        return response.json();
    }
};

export default api;
