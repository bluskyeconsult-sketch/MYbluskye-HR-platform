// src/components/ErrorBoundary.jsx
// COMPLETE ERROR BOUNDARY - Catches JavaScript errors and displays fallback UI
// Features: Error logging, refresh button, home link, error details display, optional Sentry integration

import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null,
            showDetails: false
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error: error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console
        console.error('Error caught by boundary:', error, errorInfo);
        
        // Store error info in state for debugging
        this.setState({ errorInfo: errorInfo });
        
        // Optional: Send error to logging service (Sentry, LogRocket, etc.)
        // Uncomment and configure when ready
        /*
        if (window.Sentry) {
            window.Sentry.captureException(error, { extra: errorInfo });
        }
        */
        
        // Optional: Send to your own error logging API
        // this.logErrorToAPI(error, errorInfo);
    }
    
    // Optional: Send error to backend API
    async logErrorToAPI(error, errorInfo) {
        try {
            const response = await fetch('/api/log-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo?.componentStack,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (err) {
            // Silent fail - don't create infinite loops
            console.debug('Error logging failed:', err);
        }
    }
    
    toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }));
    };
    
    handleReset = () => {
        // Clear error state and reload
        this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4 py-12">
                    <div className="max-w-lg w-full text-center">
                        {/* Error Icon */}
                        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        
                        {/* Error Title */}
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            Something Went Wrong
                        </h1>
                        
                        {/* Error Message */}
                        <p className="text-slate-400 mb-6">
                            We're sorry, but an unexpected error occurred. Our team has been notified.
                        </p>
                        
                        {/* Error Details (Toggle) */}
                        {this.state.error && (
                            <div className="mb-6">
                                <button
                                    onClick={this.toggleDetails}
                                    className="text-sm text-slate-500 hover:text-slate-400 transition"
                                >
                                    {this.state.showDetails ? 'Hide Details' : 'Show Details'}
                                </button>
                                
                                {this.state.showDetails && (
                                    <div className="mt-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-left overflow-auto max-h-64">
                                        <p className="text-red-400 text-sm font-mono break-all mb-2">
                                            {this.state.error.message}
                                        </p>
                                        {this.state.errorInfo && (
                                            <details className="mt-2">
                                                <summary className="text-slate-400 text-xs cursor-pointer">Component Stack</summary>
                                                <pre className="text-slate-500 text-xs mt-2 whitespace-pre-wrap break-all">
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            </details>
                                        )}
                                        <details className="mt-2">
                                            <summary className="text-slate-400 text-xs cursor-pointer">Call Stack</summary>
                                            <pre className="text-slate-500 text-xs mt-2 whitespace-pre-wrap break-all">
                                                {this.state.error.stack}
                                            </pre>
                                        </details>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 shadow-lg shadow-primary-500/20 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh Page
                            </button>
                            <a
                                href="/"
                                className="px-6 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-all duration-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Go Home
                            </a>
                        </div>
                        
                        {/* Support Message */}
                        <p className="text-xs text-slate-500 mt-6">
                            If the problem persists, please contact support at{' '}
                            <a href="mailto:support@bluskyeconsult.com" className="text-primary-400 hover:underline">
                                support@bluskyeconsult.com
                            </a>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
