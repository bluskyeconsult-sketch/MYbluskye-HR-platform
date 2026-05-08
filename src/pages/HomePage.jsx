import { motion } from 'framer-motion';
import HeroSection from '../components/HeroSection';
import FeaturedResources from '../components/FeaturedResources';
import CTASection from '../components/CTASection';
import AnimatedBackground from '../components/AnimatedBackground';
import RotatingPromoBanner from '../components/RotatingPromoBanner';
import ScrollingBanner from '../components/ScrollingBanner';
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

  // Stagger animation for features
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <main className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <ScrollingBanner />
        <RotatingPromoBanner />
        <HeroSection />
        
        {/* AI Governed Workforce Platform Banner */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-r from-slate-900/80 to-slate-950/80 backdrop-blur-sm border-y border-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4"
            >
              <Brain className="w-8 h-8 text-primary-400" />
              <span className="text-primary-400 font-semibold tracking-wide text-center text-sm sm:text-base">
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
        
        {/* Features Section with Stagger Animation */}
        <section className="py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4"
              >
                Why ODUSBABA is Different
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto px-2"
              >
                An intelligent governance system for the modern workforce
              </motion.p>
            </div>
            
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 max-w-7xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ 
                    y: -8, 
                    transition: { duration: 0.2 },
                    borderColor: 'rgba(11, 60, 93, 0.5)',
                    boxShadow: '0 10px 25px -5px rgba(11, 60, 93, 0.2)'
                  }}
                  className="group bg-slate-900/30 border border-slate-800 rounded-xl p-5 sm:p-6 hover:bg-slate-900/50 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3 sm:mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 text-center">{feature.title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed text-center">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
        
        <FeaturedResources />
        <CTASection />
      </div>
    </main>
  );
}
