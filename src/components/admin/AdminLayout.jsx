// src/components/admin/AdminLayout.jsx
// Consistent admin layout with navigation back to dashboard

import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Home } from 'lucide-react';

export default function AdminLayout({ children, title, description, showBackButton = true }) {
    return (
        <div className="p-6">
            {/* Breadcrumb Navigation */}
            <div className="mb-4 flex items-center gap-2 text-sm">
                <Link to="/admin/dashboard" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    Dashboard
                </Link>
                {title && (
                    <>
                        <span className="text-slate-600">/</span>
                        <span className="text-white">{title}</span>
                    </>
                )}
            </div>

            {/* Back to Dashboard Button */}
            {showBackButton && (
                <div className="mb-4">
                    <Link 
                        to="/admin/dashboard" 
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Dashboard</span>
                    </Link>
                </div>
            )}

            {/* Dashboard Home Button */}
            <div className="mb-6">
                <Link 
                    to="/admin/dashboard" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard Home
                </Link>
            </div>

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                <p className="text-slate-400 mt-1">{description}</p>
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
