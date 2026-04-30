import { motion } from 'framer-motion';
import HeroSection from '../components/HeroSection';
import ScrollingBanner from '../components/ScrollingBanner';
import FeaturedResources from '../components/FeaturedResources';
import CTASection from '../components/CTASection';
import AnimatedBackground from '../components/AnimatedBackground';
import { Shield, Brain, Users, Globe, Zap, Sparkles } from 'lucide-react';

export default function HomePage() {
  const features = [
    { icon: Brain, title: 'AI-Powered Intelligence', description: 'ODUSBABA learns from every interaction' },
    { icon: Shield, title: 'Governed Trust', description: 'Skills verified through AI and human oversight' },
    { icon: Users, title: 'Global Workforce', description: 'Connect with professionals worldwide' },
    { icon: Globe, title: '7 Countries', description: 'UK, Nigeria, Ireland, Canada, US, Germany, Australia' },
    { icon: Zap, title: 'Real-Time Matching', description: 'Instant job and skill matching powered by AI' },
    { icon: Sparkles, title: 'Value Partnership', description: 'Creating Value for Partnership in every interaction' },
  ];

  return (
    <main className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <ScrollingBanner />
        <HeroSection />
        
        <section className="py-12 px-6 bg-gradient-to-r from-slate-900/80 to-slate-950/80 backdrop-blur-sm border-y border-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="flex items-center justify-center gap-2 mb-4">
              <Brain className="w-8 h-8 text-emerald-400" />
              <span className="text-emerald-400 font-semibold tracking-wide">AI GOVERNED WORKFORCE PLATFORM</span>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} viewport={{ once: true }} className="text-slate-300 text-lg">
              Experience the future of HR with ODUSBABA's intelligence-driven governance
            </motion.p>
          </div>
        </section>
        
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-white mb-4">Why ODUSBABA is Different</motion.h2>
              <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} viewport={{ once: true }} className="text-slate-400 max-w-2xl mx-auto">An intelligent governance system for the modern workforce</motion.p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }} className="group bg-slate-900/30 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/30 hover:bg-slate-900/50 transition-all duration-300 hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        <FeaturedResources />
        <CTASection />
      </div>
    </main>
  );
}
