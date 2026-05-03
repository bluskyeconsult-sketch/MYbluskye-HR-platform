// src/components/CTASection.jsx
// COMPLETE - CTA section with working buttons

import { Link } from 'react-router-dom';
import { ArrowRight, Users, Briefcase } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-16 sm:py-20 px-4 bg-gradient-to-r from-primary-900/20 to-primary-800/5">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Transform Your HR Experience?
        </h2>
        <p className="text-slate-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of professionals and employers using ODUSBABA to build trust, verify skills, and create meaningful partnerships.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/sign-up"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/30"
          >
            <Users className="w-5 h-5" />
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-primary-500 text-primary-500 rounded-xl font-semibold hover:bg-primary-500/10 transition-all duration-200"
          >
            <Briefcase className="w-5 h-5" />
            Contact ODUSBABA
          </Link>
        </div>
        
        <p className="text-slate-500 text-xs mt-6">
          No credit card required. Free trial available for testers.
        </p>
      </div>
    </section>
  );
}
