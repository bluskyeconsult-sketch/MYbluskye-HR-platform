// src/config/api.js
// API configuration for www.bluskyeconsult.com

const isProduction = import.meta.env.PROD
const appUrl = import.meta.env.VITE_APP_URL || (isProduction ? 'https://www.bluskyeconsult.com' : 'http://localhost:5173')
const apiUrl = import.meta.env.VITE_API_URL || appUrl

export const API_CONFIG = {
  baseURL: apiUrl,
  appURL: appUrl,
  isProduction,
  endpoints: {
    marketing: '/api/marketing/content',
    health: '/api/health',
    courses: '/api/courses',
    jobs: '/api/jobs'
  },
  timeout: 30000,
  retryAttempts: 2,
  retryDelay: 1000
}

// Helper function to build full URLs
export const buildUrl = (endpoint) => {
  // If endpoint is already absolute URL, return as is
  if (endpoint.startsWith('http')) {
    return endpoint
  }
  
  // Otherwise, prepend base URL
  return `${API_CONFIG.baseURL}${endpoint}`
}

// Check if we should use mock data (for missing endpoints)
export const shouldUseMockData = (error) => {
  return error?.response?.status === 404 || error?.status === 404
}
