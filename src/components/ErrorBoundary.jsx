// src/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-slate-400 mb-4">
                            {this.state.error?.message || 'Please refresh the page or contact support.'}
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            Refresh Page
                        </button>
                        <a href="/" className="ml-3 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 inline-block">
                            Go Home
                        </a>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
