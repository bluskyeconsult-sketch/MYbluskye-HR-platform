git checkout HEAD~1 -- src/pages/AboutPage.jsx                            { icon: Briefcase, title: 'Job Board', desc: 'Browse 1,000+ verified jobs' },
                            { icon: Users, title: 'Workforce Market', desc: 'Find verified professionals' },
                            { icon: BookOpen, title: 'AI Courses', desc: 'Learn with audio narration' },
                            { icon: FileText, title: 'Assessments', desc: '7 psychometric tests' },
                            { icon: Zap, title: '24 Virtual Assistants', desc: 'AI-powered task helpers' },
                            { icon: MessageCircle, title: 'AI Career Chat', desc: '24/7 career advice' },
                            { icon: Shield, title: 'Fraud Protection', desc: 'Employer verification' },
                            { icon: Award, title: 'Certificates', desc: 'Verified credentials' }
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3">
                                <feature.icon className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-white font-medium">{feature.title}</h4>
                                    <p className="text-slate-500 text-sm">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Trust Indicators */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
                        <div className="text-4xl font-bold text-primary-400 mb-2">98%</div>
                        <p className="text-white font-medium">User Satisfaction</p>
                        <p className="text-slate-500 text-sm">Based on tester feedback</p>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
                        <div className="text-4xl font-bold text-primary-400 mb-2">24/7</div>
                        <p className="text-white font-medium">AI Availability</p>
                        <p className="text-slate-500 text-sm">Always-on support</p>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center">
                        <div className="text-4xl font-bold text-primary-400 mb-2">10k+</div>
                        <p className="text-white font-medium">Documents Generated</p>
                        <p className="text-slate-500 text-sm">CVs, letters, and more</p>
                    </div>
                </div>
            </div>

            {/* Value Promise */}
            <div className="bg-gradient-to-r from-emerald-900/20 to-primary-900/20 py-16 border-y border-emerald-500/20">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <Quote className="w-12 h-12 text-emerald-400 mx-auto mb-4 opacity-50" />
                    <p className="text-xl md:text-2xl text-white font-medium italic mb-6">
                        "We don't just connect people with jobs. We build lasting partnerships based on trust, verification, and shared success."
                    </p>
                    <div className="flex items-center justify-center gap-2">
                        <Heart className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Creating Value for Partnership</span>
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-primary-900/30 to-slate-900 rounded-2xl p-8 text-center border border-primary-500/20">
                    <h2 className="text-2xl font-bold text-white mb-4">Ready to Experience the Future of HR?</h2>
                    <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
                        Join ODUSBABA today and discover how AI-powered governance can transform your career or hiring process.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link to="/sign-up" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all">
                            Get Started Free
                        </Link>
                        <Link to="/tester-register" className="px-6 py-3 border border-primary-500 text-primary-500 rounded-xl font-semibold hover:bg-primary-500/10 transition-all">
                            Become a Tester
                        </Link>
                        <Link to="/contact" className="px-6 py-3 border border-slate-600 text-slate-300 rounded-xl font-semibold hover:bg-slate-800 transition-all">
                            Contact Sales
                        </Link>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                        Free tier available • No credit card required • 14-day money-back guarantee
                    </p>
                </div>
            </div>
        </div>
    );
}
