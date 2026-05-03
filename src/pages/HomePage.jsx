import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import CTASection from '../components/CTASection';
import AnimatedBackground from '../components/AnimatedBackground';
import RotatingPromoBanner from '../components/RotatingPromoBanner';
import { Shield, Brain, Users, Globe, Zap, Sparkles } from 'lucide-react';

export default function HomePage() {
  const features = [
    { icon: Brain, title: 'AI-Powered Intelligence', description: 'ODUSBABA learns from every interaction to provide smarter recommendations' },
    { icon: Shield, title: 'Governed Trust', description: 'Every skill verified through AI and human oversight for maximum reliability' },
    { icon: Users, title: 'Global Workforce', description: 'Connect with professionals and employers from around the world' },
    { icon: Globe, title: '7 Countries', description: 'UK, Nigeria, Ireland, Canada, US, Germany, Australia - with more coming' },
    { icon: Zap, title: 'Real-Time Matching', description: 'Instant job and skill matching powered by advanced AI algorithms' },
    { icon: Sparkles, title: 'Value Partnership', description: 'Creating Value for Partnership in every interaction and transaction' },
  ];

  return (
    <main className="min-h-screen bg-background relative w-full overflow-x-hidden">
      <AnimatedBackground />
      <div className="relative z-10 w-full">
        {/* Rotating Promo Banner - Single instance */}
        <RotatingPromoBanner />
        
        {/* Hero Section */}
        <HeroSection />
        
        {/* AI Governed Workforce Platform Banner - Centered */}
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
        
        {/* Features Section - Centered Grid */}
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
        
        {/* News & Articles Section - Fixed Links */}
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">News & Articles</h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">Stay informed with the latest insights from ODUSBABA</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all text-center sm:text-left">
                <div className="text-xs text-slate-500 mb-2">Apr 28, 2026</div>
                <h3 className="text-lg font-semibold text-white mb-2">The Future of AI in HR</h3>
                <p className="text-slate-400 text-sm mb-3">How artificial intelligence is transforming human resources...</p>
                <Link to="/articles/future-of-ai-in-hr" className="text-primary-400 text-sm hover:underline inline-flex items-center gap-1">
                  Read more →
                </Link>
              </div>
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all text-center sm:text-left">
                <div className="text-xs text-slate-500 mb-2">Apr 25, 2026</div>
                <h3 className="text-lg font-semibold text-white mb-2">New Employment Laws 2026</h3>
                <p className="text-slate-400 text-sm mb-3">Stay compliant with the latest employment regulations...</p>
                <Link to="/articles/employment-law-changes-2026" className="text-primary-400 text-sm hover:underline inline-flex items-center gap-1">
                  Read more →
                </Link>
              </div>
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all text-center sm:text-left">
                <div className="text-xs text-slate-500 mb-2">Apr 22, 2026</div>
                <h3 className="text-lg font-semibold text-white mb-2">Skill Trust Score Explained</h3>
                <p className="text-slate-400 text-sm mb-3">Understanding how our verification system builds trust...</p>
                <Link to="/articles/skill-trust-score-explained" className="text-primary-400 text-sm hover:underline inline-flex items-center gap-1">
                  Read more →
                </Link>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link to="/articles" className="text-primary-400 hover:underline text-sm sm:text-base">
                View all articles →
              </Link>
            </div>
          </div>
        </section>
        
        <CTASection />
      </div>
    </main>
  );
}
