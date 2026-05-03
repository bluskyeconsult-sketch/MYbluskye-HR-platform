// src/pages/HomePage.jsx
// COMPLETE - All buttons and links verified

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import CTASection from '../components/CTASection';
import AnimatedBackground from '../components/AnimatedBackground';
import RotatingPromoBanner from '../components/RotatingPromoBanner';
import { Shield, Brain, Users, Globe, Zap, Sparkles, Briefcase, UserCheck, BookOpen, FileText, Mail, Headphones } from 'lucide-react';

export default function HomePage() {
  const features = [
    { icon: Brain, title: 'AI-Powered Intelligence', description: 'ODUSBABA learns from every interaction to provide smarter recommendations' },
    { icon: Shield, title: 'Governed Trust', description: 'Every skill verified through AI and human oversight for maximum reliability' },
    { icon: Users, title: 'Global Workforce', description: 'Connect with professionals and employers from around the world' },
    { icon: Globe, title: '7 Countries', description: 'UK, Nigeria, Ireland, Canada, US, Germany, Australia - with more coming' },
    { icon: Zap, title: 'Real-Time Matching', description: 'Instant job and skill matching powered by advanced AI algorithms' },
    { icon: Sparkles, title: 'Value Partnership', description: 'Creating Value for Partnership in every interaction and transaction' },
  ];

  const articles = [
    { slug: 'future-of-ai-in-hr', title: 'The Future of AI in HR', date: 'Apr 28, 2026', description: 'How artificial intelligence is transforming human resources...' },
    { slug: 'employment-law-changes-2026', title: 'New Employment Laws 2026', date: 'Apr 25, 2026', description: 'Stay compliant with the latest employment regulations...' },
    { slug: 'skill-trust-score-explained', title: 'Skill Trust Score Explained', date: 'Apr 22, 2026', description: 'Understanding how our verification system builds trust...' },
  ];

  return (
    <main className="min-h-screen bg-background relative w-full overflow-x-hidden">
      <AnimatedBackground />
      <div className="relative z-10 w-full">
        
        {/* Rotating Promo Banner */}
        <RotatingPromoBanner />
        
        {/* Hero Section */}
        <HeroSection />
        
        {/* AI Governed Banner */}
        <section className="py-8 sm:py-12 px-4 bg-gradient-to-r from-slate-900/80 to-slate-950/80 backdrop-blur-sm border-y border-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-3"
            >
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400" />
              <span className="text-primary-400 font-semibold tracking-wide text-center text-xs sm:text-sm">
                AI GOVERNED WORKFORCE PLATFORM
              </span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-slate-300 text-sm sm:text-base md:text-lg"
            >
              Experience the future of HR with ODUSBABA's intelligence-driven governance
            </motion.p>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3"
              >
                Why ODUSBABA is Different
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto"
              >
                An intelligent governance system for the modern workforce
              </motion.p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group bg-slate-900/30 border border-slate-800 rounded-xl p-5 sm:p-6 hover:border-primary-500/30 hover:bg-slate-900/50 transition-all duration-300 hover:-translate-y-1 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Banner - Free Trial */}
        <section className="py-8 px-4 bg-gradient-to-r from-primary-900/20 to-primary-800/10 border-y border-primary-500/20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Start Your Free Trial</h2>
            <p className="text-slate-300 mb-6">Get 4 weeks of full access as a tester. No credit card required.</p>
            <Link 
              to="/tester-register" 
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/30"
            >
              Start Free Trial →
            </Link>
          </div>
        </section>
        
        {/* News & Articles Section */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">News & Articles</h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">Stay informed with the latest insights from ODUSBABA</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {articles.map((article, index) => (
                <div key={index} className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all text-center sm:text-left">
                  <div className="text-xs text-slate-500 mb-2">{article.date}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{article.title}</h3>
                  <p className="text-slate-400 text-sm mb-3">{article.description}</p>
                  <Link 
                    to={`/articles/${article.slug}`} 
                    className="text-primary-400 text-sm hover:underline inline-flex items-center gap-1"
                  >
                    Read more →
                  </Link>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Link 
                to="/articles" 
                className="text-primary-400 hover:underline text-sm sm:text-base inline-flex items-center gap-1"
              >
                View all articles →
              </Link>
            </div>
          </div>
        </section>
        
        {/* Quick Action Buttons */}
        <section className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Link to="/jobs" className="flex flex-col items-center p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:border-primary-500/30 hover:bg-slate-900/50 transition-all">
                <Briefcase className="w-6 h-6 text-primary-400 mb-2" />
                <span className="text-white text-sm font-medium">Browse Jobs</span>
              </Link>
              <Link to="/workforce" className="flex flex-col items-center p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:border-primary-500/30 hover:bg-slate-900/50 transition-all">
                <UserCheck className="w-6 h-6 text-primary-400 mb-2" />
                <span className="text-white text-sm font-medium">Find Talent</span>
              </Link>
              <Link to="/courses" className="flex flex-col items-center p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:border-primary-500/30 hover:bg-slate-900/50 transition-all">
                <BookOpen className="w-6 h-6 text-primary-400 mb-2" />
                <span className="text-white text-sm font-medium">Start Learning</span>
              </Link>
              <Link to="/assessments" className="flex flex-col items-center p-4 bg-slate-900/30 border border-slate-800 rounded-xl hover:border-primary-500/30 hover:bg-slate-900/50 transition-all">
                <FileText className="w-6 h-6 text-primary-400 mb-2" />
                <span className="text-white text-sm font-medium">Take Assessment</span>
              </Link>
            </div>
          </div>
        </section>
        
        <CTASection />
      </div>
    </main>
  );
}
