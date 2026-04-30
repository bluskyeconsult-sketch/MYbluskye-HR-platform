import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';
import { ArrowRight, Briefcase, Users, Award } from 'lucide-react';

export default function HeroSection() {
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [textRef, textInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const stats = [
    { icon: Briefcase, value: 98, suffix: '%', label: 'CONFIDENCE', description: 'Task Execution Success Rate' },
    { icon: Users, value: 24, suffix: '/7', label: 'AVAILABILITY', description: 'Always-on AI Assistance' },
    { icon: Award, value: 10, suffix: 'k+', label: 'IMPACT', description: 'Documents Generated Globally' }
  ];

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute top-20 left-10 w-96 h-96 bg-sky-500 rounded-full blur-[128px] opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-[128px] opacity-20 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-500/5 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          ref={textRef}
          initial={{ opacity: 0, y: 30 }}
          animate={textInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={textInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
            </span>
            <span className="text-sky-400 text-sm font-medium">✨ Creating Value for Partnership</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={textInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
              ODUSBABA
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={textInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-300 mb-4"
          >
            The Governed Workforce Platform
          </motion.p>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={textInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-8"
          >
            Verified skills. Trusted hiring. Built on intelligence, not noise.
          </motion.p>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={textInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-base text-slate-500 max-w-2xl mx-auto mb-12 italic"
          >
            "An Experience of Value and solution to possible HR realities."
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={textInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <a 
              href="/jobs" 
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25"
            >
              Browse Jobs
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="/workforce" 
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700 transition-all duration-300 hover:scale-105"
            >
              Workforce Market
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="/contact" 
              className="group relative inline-flex items-center gap-2 px-8 py-4 border border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-800 transition-all duration-300 hover:scale-105"
            >
              Contact ODUSBABA
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          ref={statsRef}
          initial={{ opacity: 0, y: 30 }}
          animate={statsInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              className="group relative bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center hover:border-slate-700 hover:bg-slate-900/70 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="inline-flex p-3 rounded-xl bg-emerald-500/10 text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">
                {statsInView ? (
                  <CountUp start={0} end={stat.value} duration={1.5} suffix={stat.suffix} />
                ) : (
                  `0${stat.suffix}`
                )}
              </div>
              <div className="text-sm font-semibold text-slate-300 tracking-wider mb-1">{stat.label}</div>
              <div className="text-xs text-slate-500">{stat.description}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
