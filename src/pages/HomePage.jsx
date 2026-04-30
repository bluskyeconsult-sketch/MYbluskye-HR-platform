import { motion } from 'framer-motion';
import HeroSection from '../components/HeroSection';
import ScrollingBanner from '../components/ScrollingBanner';
import FeaturedResources from '../components/FeaturedResources';
import CTASection from '../components/CTASection';
import { Sparkles, Shield, Zap, Globe, TrendingUp, Headphones } from 'lucide-react';

export default function HomePage() {
  const features = [
    { icon: Shield, title: 'Governed Trust', description: 'Every skill verified through AI and human oversight' },
    { icon: Zap, title: 'AI Intelligence', description: 'Smart matching and career guidance powered by AI' },
    { icon: Globe, title: 'Global Reach', description: 'Jobs and talent from 7 countries and growing' },
    { icon: TrendingUp, title: 'Career Growth', description: 'Personalized recommendations for skill development' },
    { icon: Headphones, title: '24/7 Support', description: 'ODUSBABA AI assistant always ready to help' },
    { icon: Sparkles, title: 'Value Partnership', description: 'Creating Value for Partnership in every interaction' },
  ];

  return (
    <main className="min-h-screen bg-background">
      <ScrollingBanner />
      <HeroSection />
      
      {/* Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-background to-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Why Choose ODUSBABA?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-slate-400 max-w-2xl mx-auto"
            >
              An Experience of Value and solution to possible HR realities
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group bg-slate-900/30 border border-slate-800 rounded-xl p-6 hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-300 hover:-translate-y-1"
              >
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
    </main>
  );
}
