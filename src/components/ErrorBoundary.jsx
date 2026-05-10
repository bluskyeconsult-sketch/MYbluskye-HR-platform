// src/components/ErrorBoundary.jsx
// Global Error Boundary - Catches JavaScript errors and displays fallback UI

import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({ errorInfo: errorInfo });
        
        // Send error to logging service (optional)
        // You can add Sentry or similar here
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                    <div className="max-w-md text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-slate-400 mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page.
                        </p>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-6 text-left">
                            <p className="text-red-400 text-sm font-mono break-all">{this.state.error?.message}</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                Refresh Page
                            </button>
                            <a
                                href="/"
                                className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800"
                            >
                                Go Home
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
