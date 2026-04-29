import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Twitter, Linkedin, Github, Facebook } from 'lucide-react'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    const quickLinks = [
        { name: 'Home', path: '/' },
        { name: 'Jobs', path: '/jobs' },
        { name: 'Workforce', path: '/workforce' },
        { name: 'Courses', path: '/courses' },
        { name: 'Books', path: '/books' },
        { name: 'Resources', path: '/resources' },
    ]

    const legalLinks = [
        { name: 'Terms of Service', path: '/legal/terms' },
        { name: 'Privacy Policy', path: '/legal/privacy' },
        { name: 'Cookie Policy', path: '/legal/cookies' },
        { name: 'AI Disclaimer', path: '/legal/disclaimer' },
        { name: 'Acceptable Use', path: '/legal/acceptable-use' },
    ]

    const socialLinks = [
        { icon: Twitter, href: 'https://twitter.com/bluskye', label: 'Twitter' },
        { icon: Linkedin, href: 'https://linkedin.com/company/bluskye', label: 'LinkedIn' },
        { icon: Github, href: 'https://github.com/bluskye', label: 'GitHub' },
        { icon: Facebook, href: 'https://facebook.com/bluskye', label: 'Facebook' },
    ]

    return (
        <footer className="bg-[#0f0f23] text-gray-400 mt-auto">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Brand Section */}
                    <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                            BluSkyE
                        </h3>
                        <p className="text-sm mb-4">
                            Your intelligent platform for expert tools, verified jobs, and AI-driven insights.
                        </p>
                        <div className="flex space-x-4">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-blue-400 transition-colors duration-200 transform hover:scale-110"
                                    aria-label={social.label}
                                >
                                    <social.icon size={20} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            {quickLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="hover:text-white transition-colors duration-200 text-sm"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2">
                            {legalLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="hover:text-white transition-colors duration-200 text-sm"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Contact Us</h4>
                        <ul className="space-y-3">
                            <li className="flex items-center space-x-3 text-sm">
                                <Mail size={16} className="text-blue-400" />
                                <a href="mailto:info@bluskye.com" className="hover:text-white transition-colors">
                                    info@bluskye.com
                                </a>
                            </li>
                            <li className="flex items-center space-x-3 text-sm">
                                <Phone size={16} className="text-blue-400" />
                                <a href="tel:+442012345678" className="hover:text-white transition-colors">
                                    +44 20 1234 5678
                                </a>
                            </li>
                            <li className="flex items-center space-x-3 text-sm">
                                <MapPin size={16} className="text-blue-400" />
                                <span>London, United Kingdom</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center text-sm">
                        <p>© {currentYear} Bluskyeconsult. All rights reserved.</p>
                        <div className="flex space-x-6 mt-2 md:mt-0">
                            <Link to="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
                            <Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <Link to="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
