import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useAnimation } from 'framer-motion'
import { ArrowRight, Briefcase, FileText, Clock, Award, TrendingUp } from 'lucide-react'

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
}

export default function HomePage() {
    const controls = useAnimation()
    const ref = useRef(null)
    const inView = useInView(ref, { once: true, threshold: 0.1 })

    useEffect(() => {
        if (inView) {
            controls.start('visible')
        }
    }, [controls, inView])

    const stats = [
        { value: '98%', label: 'CONFIDENCE', description: 'Task Execution Success Rate', icon: TrendingUp },
        { value: '24/7', label: 'AVAILABILITY', description: 'Always-on AI Assistance', icon: Clock },
        { value: '10k+', label: 'IMPACT', description: 'Documents Generated Globally', icon: Award },
    ]

    const featuredResources = [
        { title: 'CV Revamp Standard', price: '$15', rating: 4.9, description: 'Professional rewrite of your curriculum vitae to meet industry standards.', icon: FileText },
        { title: 'CV Revamp Professional', price: '$25', rating: 4.9, description: 'ATS-optimized CV revamp including keyword targeting for senior roles.', icon: FileText },
        { title: 'HR Policy Draft', price: '$45', rating: 4.9, description: 'Custom drafted HR policy document for your organization.', icon: Briefcase },
    ]

    return (
        <div className="bg-[#1a1a2e] min-h-screen pt-20">
            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 md:py-32">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-transparent"></div>
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                        className="text-center"
                    >
                        <motion.div variants={fadeInUp} className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-sm font-medium text-white shadow-lg">
                                🚀 NEW: AI CAREER INTELLIGENCE
                            </span>
                        </motion.div>

                        <motion.h1 
                            variants={fadeInUp}
                            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent"
                        >
                            Empowering <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">HR & Careers</span>
                        </motion.h1>

                        <motion.p 
                            variants={fadeInUp}
                            className="text-xl text-gray-300 max-w-2xl mx-auto mb-10"
                        >
                            Your intelligent platform for expert tools, verified jobs, and AI-driven insights to navigate the modern workforce.
                        </motion.p>

                        <motion.div 
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row justify-center gap-4"
                        >
                            <Link
                                to="/library"
                                className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                            >
                                Browse Library
                            </Link>
                            <Link
                                to="/pricing"
                                className="px-8 py-3 border border-gray-600 text-gray-300 rounded-full font-semibold hover:bg-gray-800 hover:border-gray-500 transition-all duration-300 transform hover:scale-105"
                            >
                                Get Access
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Stats Cards */}
            <motion.section 
                ref={ref}
                animate={controls}
                initial="hidden"
                variants={staggerContainer}
                className="py-16"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                variants={fadeInUp}
                                whileHover={{ y: -10, scale: 1.02 }}
                                className="bg-gradient-to-br from-[#16213e] to-[#0f0f23] rounded-2xl p-8 text-center border border-gray-800 hover:border-blue-500/50 transition-all duration-300 group"
                            >
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <stat.icon className="w-8 h-8 text-blue-400" />
                                </div>
                                <h3 className="text-4xl font-bold text-white mb-2">{stat.value}</h3>
                                <p className="text-blue-400 font-semibold mb-2">{stat.label}</p>
                                <p className="text-gray-400 text-sm">{stat.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Featured Resources */}
            <motion.section 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, threshold: 0.1 }}
                variants={staggerContainer}
                className="py-20"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div variants={fadeInUp} className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Featured Resources</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Accelerate your growth with our premium selection of tools, books, and courses.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {featuredResources.map((resource, index) => (
                            <motion.div
                                key={resource.title}
                                variants={fadeInUp}
                                whileHover={{ y: -10, scale: 1.02 }}
                                className="bg-gradient-to-br from-[#16213e] to-[#0f0f23] rounded-2xl overflow-hidden border border-gray-800 hover:border-purple-500/50 transition-all duration-300"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="inline-flex items-center space-x-1 px-3 py-1 bg-purple-500/20 rounded-full">
                                            <span className="text-purple-400 text-xs font-medium">⭐ {resource.rating}</span>
                                        </div>
                                        <resource.icon className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{resource.title}</h3>
                                    <p className="text-gray-400 text-sm mb-4">{resource.description}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-2xl font-bold text-blue-400">{resource.price}</span>
                                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300">
                                            Get Started
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Latest Job Openings Preview */}
            <motion.section 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, threshold: 0.1 }}
                variants={fadeInUp}
                className="py-16"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-r from-[#16213e] to-[#0f0f23] rounded-2xl p-8 md:p-12 text-center border border-gray-800">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Latest Job Openings</h2>
                        <p className="text-gray-400 mb-6">Discover verified opportunities tailored to your skills.</p>
                        <div className="inline-block px-6 py-3 bg-gray-800 rounded-lg text-gray-400 mb-6">
                            No jobs currently previewed. Check the full board.
                        </div>
                        <div>
                            <Link
                                to="/jobs"
                                className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors duration-200 group"
                            >
                                <span>View All Jobs</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Call to Action */}
            <motion.section 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, threshold: 0.1 }}
                variants={fadeInUp}
                className="py-20"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to elevate your career?</h2>
                            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                                Join thousands of professionals using Blusky to secure their future.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link
                                    to="/sign-up"
                                    className="px-8 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
                                >
                                    Start For Free
                                </Link>
                                <Link
                                    to="/contact"
                                    className="px-8 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
                                >
                                    Contact Sales
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>
        </div>
    )
}
