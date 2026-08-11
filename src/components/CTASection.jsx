// src/components/CTASection.jsx - UNIFIED & OPTIMIZED FOR MOBILE
// ODUSBABA CTA Section - Mobile-First with Rich Features
//
// FIXED (2026-08-07): the "Get Started Free" link's arrow icon used
// group-hover:translate-x-1, but the parent <Link> never declared the `group`
// class — so that hover animation could never actually fire. Added it.

import { Link } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, Sparkles } from 'lucide-react';

export default function CTASection() {
    return (
        <section className="py-12 sm:py-16 lg:py-20 px-4 bg-gradient-to-r from-primary-900/20 via-primary-800/10 to-sky-600/10">
            <div className="w-full max-w-4xl mx-auto text-center">
                {/* Decorative badge - optional enhancement */}
                <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-3 py-1 mb-4 sm:mb-6">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400" />
                    <span className="text-primary-400 text-xs sm:text-sm font-medium">Trusted by 500+ Companies</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                    Ready to Transform Your HR Experience?
                </h2>
                
                <p className="text-slate-300 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
                    Join thousands of professionals and employers using ODUSBABA to build trust, verify skills, and create meaningful partnerships.
                </p>
                
                {/* CTA Buttons - Responsive Stack on Mobile */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <Link
                        to="/sign-up"
                        className="group inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:scale-105 text-sm sm:text-base"
                    >
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        Get Started Free
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    
                    <Link
                        to="/contact"
                        className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 border border-primary-500/50 text-primary-400 rounded-xl font-semibold hover:bg-primary-500/10 hover:border-primary-500 transition-all duration-200 text-sm sm:text-base"
                    >
                        <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                        Contact ODUSBABA
                    </Link>
                </div>
                
                {/* Informative Message - Enhanced */}
                <div className="mt-4 sm:mt-6 space-y-1">
                    <p className="text-slate-500 text-xs sm:text-sm">
                        ✓ No credit card required · ✓ Free trial available for testers · ✓ Cancel anytime
                    </p>
                    <p className="text-slate-600 text-[10px] sm:text-xs">
                        Join 500+ companies already using ODUSBABA
                    </p>
                </div>
            </div>
        </section>
    );
}
