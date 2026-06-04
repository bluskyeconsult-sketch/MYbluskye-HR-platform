// src/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
        this.setState({ errorInfo });
        
        // Log to your analytics or API
        try {
            fetch('/api/index?action=track-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: 'frontend_error',
                    event_data: { message: error.message, stack: error.stack }
                })
            }).catch(() => {});
        } catch (e) {}
    }

    handleRefresh = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Something Went Wrong</h1>
                        <p className="text-slate-400 mb-6">
                            An unexpected error occurred. Our team has been notified.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRefresh}
                                className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-5 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                            >
                                Go Home
                            </button>
                        </div>
                        {this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-sm text-slate-500 cursor-pointer">Technical Details</summary>
                                <pre className="text-xs text-red-400 mt-2 p-2 bg-slate-900 rounded overflow-auto">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                        <p className="text-xs text-slate-500 mt-6">
                            If the problem persists, please contact support at support@bluskyeconsult.com
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
