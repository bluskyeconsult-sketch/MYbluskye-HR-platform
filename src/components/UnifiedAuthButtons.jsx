import { useState } from 'react'
import { ChevronDown, User, LogIn, UserPlus, FlaskConical } from 'lucide-react'

export default function UnifiedAuthButtons({ user, onLogout }) {
    const [isOpen, setIsOpen] = useState(false)

    if (user) {
        // Logged in user menu
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                    <User className="w-4 h-4" />
                    <span className="text-sm">{user.email?.split('@')[0]}</span>
                    <ChevronDown className="w-3 h-3" />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                        <a href="/dashboard" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Dashboard</a>
                        <a href="/profile" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Profile</a>
                        <a href="/settings" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Settings</a>
                        <hr className="border-slate-700" />
                        <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700">
                            Logout
                        </button>
                    </div>
                )}
            </div>
        )
    }

    // Not logged in - unified auth buttons
    return (
        <div className="flex items-center gap-2">
            {/* Tester Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-colors text-sm"
                >
                    <FlaskConical className="w-4 h-4" />
                    Tester
                    <ChevronDown className="w-3 h-3" />
                </button>
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                        <a href="/tester-login" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Tester Login</a>
                        <a href="/tester-register" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Become a Tester</a>
                    </div>
                )}
            </div>

            {/* Sign In / Sign Up */}
            <a href="/sign-in" className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                Sign In
            </a>
            <a href="/sign-up" className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500 transition-colors">
                Sign Up
            </a>
        </div>
    )
}
