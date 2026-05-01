import { useState } from 'react'
import { ChevronDown, User, LogIn, UserPlus, FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function UnifiedAuthButtons({ user, onLogout }) {
    const [isOpen, setIsOpen] = useState(false)
    const [testerOpen, setTesterOpen] = useState(false)

    if (user) {
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
                        <Link to="/dashboard" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Dashboard</Link>
                        <Link to="/profile" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Profile</Link>
                        <Link to="/applications" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Applications</Link>
                        <Link to="/skills" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Skills</Link>
                        <Link to="/settings" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Settings</Link>
                        <hr className="border-slate-700" />
                        <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700">
                            Logout
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <button
                    onClick={() => setTesterOpen(!testerOpen)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-colors text-sm"
                >
                    <FlaskConical className="w-4 h-4" />
                    Tester
                    <ChevronDown className="w-3 h-3" />
                </button>
                {testerOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                        <Link to="/tester-login" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Tester Login</Link>
                        <Link to="/tester-register" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Become a Tester</Link>
                    </div>
                )}
            </div>

            <Link to="/sign-in" className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
                Sign In
            </Link>
            <Link to="/sign-up" className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors">
                Sign Up
            </Link>
        </div>
    )
}
