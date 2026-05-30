// src/components/ErrorBoundary.jsx
// COMPLETE PROFESSIONAL ERROR BOUNDARY - Catches errors, reports to API, provides recovery options

import { Component } from 'react';
import { AlertCircle, RefreshCw, Home, Copy, CheckCircle, Bug, Shield, MessageCircle } from 'lucide-react';

// Error type classification
const ERROR_TYPES = {
    NETWORK: 'network',
    AUTH: 'auth',
    RUNTIME: 'runtime',
    API: 'api',
    UNKNOWN: 'unknown'
};

// User-friendly error messages
const ERROR_MESSAGES = {
    [ERROR_TYPES.NETWORK]: 'Network connection issue. Please check your internet connection.',
    [ERROR_TYPES.AUTH]: 'Authentication error. Please try logging in again.',
    [ERROR_TYPES.RUNTIME]: 'Application error. Please refresh the page.',
    [ERROR_TYPES.API]: 'Service temporarily unavailable. Please try again later.',
    [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Our team has been notified.'
};

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorType: ERROR_TYPES.UNKNOWN,
            showDetails: false,
            reported: false,
            copied: false,
            recoveryAttempts: 0
        };
    }

    static getDerivedStateFromError(error) {
        return { 
            hasError: true, 
            error,
            errorType: ErrorBoundary.classifyError(error)
        };
    }

    static classifyError(error) {
        if (!error) return ERROR_TYPES.UNKNOWN;
        
        const message = error.message?.toLowerCase() || '';
        
        if (message.includes('network') || message.includes('fetch') || message.includes('internet')) {
            return ERROR_TYPES.NETWORK;
        }
        if (message.includes('auth') || message.includes('login') || message.includes('session') || message.includes('token')) {
            return ERROR_TYPES.AUTH;
        }
        if (message.includes('api') || message.includes('500') || message.includes('503')) {
            return ERROR_TYPES.API;
        }
        if (message.includes('typeerror') || message.includes('referenceerror')) {
            return ERROR_TYPES.RUNTIME;
        }
        
        return ERROR_TYPES.UNKNOWN;
    }

    async componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        
        // Store error info
        this.setState({ errorInfo });
        
        // Report error to unified API (non-blocking)
        await this.reportErrorToAPI(error, errorInfo);
        
        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    async reportErrorToAPI(error, errorInfo) {
        if (this.state.reported) return;
        
        try {
            // Get current user if available
            let userId = null;
            let userEmail = null;
            try {
                const { data: { user } } = await import('../lib/supabase').then(module => module.supabase.auth.getUser());
                if (user) {
                    userId = user.id;
                    userEmail = user.email;
                }
            } catch (e) {
                // Ignore auth errors
            }
            
            // Report to unified API
            const response = await fetch('/api/index?action=report-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: {
                        message: error?.message || 'Unknown error',
                        stack: error?.stack,
                        name: error?.name
                    },
                    errorInfo: {
                        componentStack: errorInfo?.componentStack,
                        componentName: this.props.name || 'UnknownComponent'
                    },
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    userId,
                    userEmail,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                this.setState({ reported: true });
            }
        } catch (reportError) {
            console.warn('Failed to report error to API:', reportError);
            // Don't set reported to true - allow retry on next error
        }
    }

    handleRefresh = () => {
        const { recoveryAttempts } = this.state;
        const maxAttempts = this.props.maxRecoveryAttempts || 3;
        
        if (recoveryAttempts >= maxAttempts) {
            // Too many attempts, clear storage and reload
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        } else {
            this.setState(prev => ({ recoveryAttempts: prev.recoveryAttempts + 1 }));
            window.location.reload();
        }
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    handleClearStorage = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    };

    handleCopyError = () => {
        const { error, errorInfo } = this.state;
        const errorText = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
        `.trim();
        
        navigator.clipboard.writeText(errorText);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 3000);
    };

    toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }));
    };

    renderErrorIcon() {
        const { errorType } = this.state;
        
        switch (errorType) {
            case ERROR_TYPES.NETWORK:
                return <div className="text-6xl mb-4">🌐</div>;
            case ERROR_TYPES.AUTH:
                return <div className="text-6xl mb-4">🔒</div>;
            case ERROR_TYPES.API:
                return <div className="text-6xl mb-4">⚙️</div>;
            default:
                return (
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
                        <Bug className="w-10 h-10 text-red-400" />
                    </div>
                );
        }
    }

    render() {
        if (this.state.hasError) {
            const { errorType, error, errorInfo, showDetails, copied } = this.state;
            const friendlyMessage = ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
            
            return (
                <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
                    <div className="max-w-lg w-full">
                        {/* Error Card */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-sm shadow-2xl">
                            {this.renderErrorIcon()}
                            
                            <h1 className="text-2xl font-bold text-white mb-2">
                                {errorType === ERROR_TYPES.NETWORK ? 'Connection Issue' :
                                 errorType === ERROR_TYPES.AUTH ? 'Session Expired' :
                                 errorType === ERROR_TYPES.API ? 'Service Unavailable' :
                                 'Something Went Wrong'}
                            </h1>
                            
                            <p className="text-slate-400 mb-4">
                                {friendlyMessage}
                            </p>
                            
                            {errorType === ERROR_TYPES.AUTH && (
                                <p className="text-sm text-amber-400/80 mb-4">
                                    Try logging in again to continue.
                                </p>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 justify-center mb-6">
                                <button
                                    onClick={this.handleRefresh}
                                    className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh Page
                                </button>
                                
                                <button
                                    onClick={this.handleGoHome}
                                    className="px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all duration-200 flex items-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    Go Home
                                </button>
                                
                                {errorType === ERROR_TYPES.AUTH && (
                                    <button
                                        onClick={this.handleClearStorage}
                                        className="px-5 py-2.5 bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-all duration-200 flex items-center gap-2 border border-amber-500/30"
                                    >
                                        <Shield className="w-4 h-4" />
                                        Clear Session
                                    </button>
                                )}
                            </div>
                            
                            {/* Error Details (Toggle for debugging) */}
                            {this.props.showDebug && (
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <button
                                        onClick={this.toggleDetails}
                                        className="text-xs text-slate-500 hover:text-slate-400 transition flex items-center gap-1 mx-auto"
                                    >
                                        <Bug className="w-3 h-3" />
                                        {showDetails ? 'Hide Details' : 'Show Error Details'}
                                    </button>
                                    
                                    {showDetails && (
                                        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg text-left">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-xs font-mono text-red-400 break-all">
                                                    {error?.message || 'Unknown error'}
                                                </p>
                                                <button
                                                    onClick={this.handleCopyError}
                                                    className="p-1 text-slate-500 hover:text-white transition"
                                                    title="Copy error"
                                                >
                                                    {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                            {error?.stack && (
                                                <pre className="text-xs text-slate-500 overflow-x-auto max-h-32">
                                                    {error.stack}
                                                </pre>
                                            )}
                                            {errorInfo?.componentStack && (
                                                <details className="mt-2">
                                                    <summary className="text-xs text-slate-500 cursor-pointer">Component Stack</summary>
                                                    <pre className="text-xs text-slate-600 mt-1 overflow-x-auto">
                                                        {errorInfo.componentStack}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Support Contact */}
                            <p className="text-xs text-slate-600 mt-6">
                                If the problem persists, please contact support at{' '}
                                <a href="mailto:support@bluskyeconsult.com" className="text-primary-400 hover:underline">
                                    support@bluskyeconsult.com
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Optional: Higher-order component for functional components
export function withErrorBoundary(Component, options = {}) {
    return function WithErrorBoundary(props) {
        return (
            <ErrorBoundary {...options}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}

// Optional: Hook for error reporting (for use inside components)
export function useErrorReporting() {
    const reportError = async (error, context = {}) => {
        try {
            await fetch('/api/index?action=report-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: {
                        message: error?.message || 'Unknown error',
                        stack: error?.stack,
                        name: error?.name
                    },
                    context,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (e) {
            console.warn('Failed to report error:', e);
        }
    };
    
    return { reportError };
}

export default ErrorBoundary;
