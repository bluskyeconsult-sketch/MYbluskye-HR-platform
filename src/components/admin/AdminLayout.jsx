// src/components/admin/AdminLayout.jsx
// Admin layout with consistent navigation

import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function AdminLayout({ children, title, description }) {
    return (
        <div className="p-6">
            {/* Back to Dashboard Button */}
            <div className="mb-4">
                <Link 
                    to="/admin/dashboard" 
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </Link>
            </div>

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                <p className="text-slate-400">{description}</p>
            </div>

            {/* Dashboard Button */}
            <div className="mb-4">
                <Link 
                    to="/admin/dashboard" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard Home
                </Link>
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
