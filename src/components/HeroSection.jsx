import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';

export default function HeroSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 sm:py-16 md:py-20 px-4">
      {/* Animated background glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-48 h-48 sm:w-64 sm:h-64 bg-primary-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-48 h-48 sm:w-80 sm:h-80 bg-primary-400 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs sm:text-sm mb-4 border border-primary-500/20">
            ✨ Creating Value for Partnership
          </span>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent px-2">
            BluSkye Integrated Consult
          </h1>
          
          <p className="text-xs sm:text-sm md:text-base text-slate-400 mt-1">
            powered by <span className="text-primary-400 font-semibold">ODUSBABA</span> intelligence
          </p>
          
          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto mt-4 px-2">
            The Governed Workforce Platform. Verified skills. Trusted hiring.
          </p>
          
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl mx-auto px-2 italic">
            "An Experience of Value and solution to possible HR realities."
          </p>

          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center mt-6">
            <a href="/jobs" className="btn-primary text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
              Browse Jobs
            </a>
            <a href="/workforce" className="btn-secondary text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
              Workforce Market
            </a>
            <a href="/contact" className="btn-outline text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
              Contact ODUSBABA
            </a>
          </div>
        </motion.div>

        {/* Stats Cards - Centered on mobile */}
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 max-w-3xl mx-auto">
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
              className="rounded-xl border border-slate-800 bg-slate-950/50 backdrop-blur-sm p-4 sm:p-6 text-center hover:border-primary-500/30 transition-all"
            >
              <div className="text-3xl sm:text-4xl font-bold text-primary-400">
                {inView ? (
                  <CountUp start={0} end={stat.value} duration={1.2} suffix={stat.suffix || ''} />
                ) : (
                  '0'
                )}
              </div>
              <div className="text-xs sm:text-sm text-slate-400 mt-2 tracking-wider font-semibold">{stat.label}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
