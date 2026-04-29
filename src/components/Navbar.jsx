import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { Menu, X, ChevronDown, User, LogOut, Settings, Briefcase, BookOpen, Star, HelpCircle } from 'lucide-react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [user, setUser] = useState(null)
    const [userType, setUserType] = useState(null)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [resourcesOpen, setResourcesOpen] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        getUser()
    }, [])

    async function getUser() {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', user.id)
                .single()
            setUserType(profile?.user_type)
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/')
        window.location.reload()
    }

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Jobs', path: '/jobs' },
        { name: 'Workforce', path: '/workforce' },
        { name: 'Courses', path: '/courses' },
        { name: 'Books', path: '/books' },
    ]

    const resourcesLinks = [
        { name: 'About', path: '/about' },
        { name: 'Contact', path: '/contact' },
        { name: 'Pricing', path: '/pricing' },
        { name: 'Blog', path: '/blog' },
    ]

    const userLinks = [
        { name: 'Dashboard', path: '/dashboard', icon: <User size={16} /> },
        { name: 'My Applications', path: '/applications', icon: <Briefcase size={16} /> },
        { name: 'My Skills', path: '/skills', icon: <Star size={16} /> },
        { name: 'My Courses', path: '/my-courses', icon: <BookOpen size={16} /> },
        { name: 'Settings', path: '/settings', icon: <Settings size={16} /> },
    ]

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled ? 'bg-[#1a1a2e] shadow-lg py-3' : 'bg-[#1a1a2e] py-5'
        }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 group">
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                            BluSkyE
                        </span>
                        <span className="text-xs text-gray-400 hidden sm:inline">ODUSBABA</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className="text-gray-300 hover:text-white transition-colors duration-200 relative group"
                            >
                                {link.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                        ))}

                        {/* Resources Dropdown */}
                        <div className="relative">
                            <button
                                onMouseEnter={() => setResourcesOpen(true)}
                                onMouseLeave={() => setResourcesOpen(false)}
                                className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors duration-200"
                            >
                                <span>Resources</span>
                                <ChevronDown size={16} className={`transition-transform duration-300 ${resourcesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {resourcesOpen && (
                                <div 
                                    onMouseEnter={() => setResourcesOpen(true)}
                                    onMouseLeave={() => setResourcesOpen(false)}
                                    className="absolute top-full left-0 mt-2 w-48 bg-[#16213e] rounded-lg shadow-xl py-2 animate-fadeIn"
                                >
                                    {resourcesLinks.map((link) => (
                                        <Link
                                            key={link.name}
                                            to={link.path}
                                            className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-[#1a1a2e] transition-colors duration-200"
                                        >
                                            {link.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tester Login Button */}
                        <Link
                            to="/tester-login"
                            className="px-4 py-2 border border-purple-500 text-purple-400 rounded-lg hover:bg-purple-500 hover:text-white transition-all duration-300"
                        >
                            🧪 Tester Login
                        </Link>

                        <Link
                            to="/tester-register"
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105"
                        >
                            Become a Tester
                        </Link>

                        {/* Auth Buttons or User Menu */}
                        {!user ? (
                            <div className="flex items-center space-x-4">
                                <Link
                                    to="/sign-in"
                                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/sign-up"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#16213e] hover:bg-[#0f3460] transition-all duration-200"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                        <span className="text-sm font-medium">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} className={`transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-[#16213e] rounded-lg shadow-xl py-2 animate-fadeIn">
                                        {userType === 'admin' || userType === 'super_admin' ? (
                                            <Link
                                                to="/admin/dashboard"
                                                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-[#1a1a2e] transition-colors duration-200"
                                            >
                                                <Settings size={16} />
                                                <span>Admin Dashboard</span>
                                            </Link>
                                        ) : (
                                            userLinks.map((link) => (
                                                <Link
                                                    key={link.name}
                                                    to={link.path}
                                                    className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-[#1a1a2e] transition-colors duration-200"
                                                >
                                                    {link.icon}
                                                    <span>{link.name}</span>
                                                </Link>
                                            ))
                                        )}
                                        <hr className="my-2 border-gray-700" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center space-x-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-[#1a1a2e] transition-colors duration-200"
                                        >
                                            <LogOut size={16} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-gray-300 hover:text-white focus:outline-none"
                    >
                        {isOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                <div className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                }`}>
                    <div className="flex flex-col space-y-3 pb-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                className="text-gray-300 hover:text-white py-2 transition-colors duration-200"
                            >
                                {link.name}
                            </Link>
                        ))}
                        
                        <div className="pt-2 space-y-2">
                            <Link
                                to="/tester-login"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-2 border border-purple-500 text-purple-400 rounded-lg text-center hover:bg-purple-500 hover:text-white transition-all duration-300"
                            >
                                🧪 Tester Login
                            </Link>
                            <Link
                                to="/tester-register"
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-2 bg-purple-600 text-white rounded-lg text-center hover:bg-purple-700 transition-all duration-300"
                            >
                                Become a Tester
                            </Link>
                        </div>

                        {!user ? (
                            <div className="flex flex-col space-y-2 pt-2">
                                <Link
                                    to="/sign-in"
                                    onClick={() => setIsOpen(false)}
                                    className="text-center text-gray-300 hover:text-white py-2"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/sign-up"
                                    onClick={() => setIsOpen(false)}
                                    className="text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        ) : (
                            <button
                                onClick={handleLogout}
                                className="text-red-400 hover:text-red-300 py-2 text-center"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
