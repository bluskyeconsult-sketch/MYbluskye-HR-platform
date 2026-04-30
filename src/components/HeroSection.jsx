import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';

export default function HeroSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20 px-6">
      {/* Animated background glow */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-sky-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-emerald-500 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-sm mb-6 border border-sky-500/20">
            ✨ Creating Value for Partnership
          </span>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
            ODUSBABA
          </h1>
          
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            The Governed Workforce Platform. Verified skills. Trusted hiring.
          </p>
          
          <p className="text-base text-slate-400 mt-4 max-w-2xl mx-auto">
            An Experience of Value and solution to possible HR realities.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <a href="/jobs" className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-500 transition-all hover:scale-105">
              Browse Jobs
            </a>
            <a href="/workforce" className="bg-slate-800 text-slate-200 px-6 py-3 rounded-lg font-medium hover:bg-slate-700 transition-all hover:scale-105">
              Workforce Market
            </a>
            <a href="/contact" className="border border-slate-700 text-slate-300 px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-all">
              Contact ODUSBABA
            </a>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {[
            { value: 98, suffix: '%', label: 'CONFIDENCE', desc: 'Task Execution Success Rate' },
            { value: 24, suffix: '/7', label: 'AVAILABILITY', desc: 'Always-on AI Assistance' },
            { value: 10, suffix: 'k+', label: 'IMPACT', desc: 'Documents Generated Globally' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-xl border border-slate-800 bg-slate-950/50 backdrop-blur-sm p-6 text-center hover:border-slate-700 transition-all"
            >
              <div className="text-4xl font-bold text-emerald-400">
                {inView ? (
                  <CountUp start={0} end={stat.value} duration={1.2} suffix={stat.suffix || ''} />
                ) : (
                  '0'
                )}
              </div>
              <div className="text-sm text-slate-400 mt-2 tracking-wider">{stat.label}</div>
              <div className="text-xs text-slate-500">{stat.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
