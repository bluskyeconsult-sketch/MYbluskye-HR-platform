import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-20 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm">Creating Value for Partnership</span>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Transform Your HR Experience?
        </h2>
        
        <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          Join thousands of professionals and employers using ODUSBABA to build trust, verify skills, and create meaningful partnerships.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center">
          <Link 
            to="/sign-up" 
            className="group inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/contact" 
            className="group inline-flex items-center gap-2 px-8 py-4 border border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-800 transition-all duration-300 hover:scale-105"
          >
            Contact ODUSBABA
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <p className="text-xs text-slate-500 mt-6">
          No credit card required • Free tier available • Upgrade anytime
        </p>
      </div>
    </section>
  );
}
