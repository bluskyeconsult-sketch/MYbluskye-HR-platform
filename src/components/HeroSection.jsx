import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';

export default function HeroSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20 px-6">
      {/* Background glow effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-sky-500 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-emerald-500 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-center"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-sm mb-6 border border-sky-500/20">
            NEW: AI CAREER INTELLIGENCE
          </span>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            The Governed Workforce Platform
          </h1>
          
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Verified skills. Trusted hiring. Built on intelligence, not noise.
          </p>
          
          <p className="text-base text-slate-400 mt-4 max-w-2xl mx-auto">
            ODUSBABA connects professionals and employers through AI-assisted verification, human oversight, and enforceable governance.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <button className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-500 transition-colors">
              Explore Workforce Market
            </button>
            <button className="bg-slate-800 text-slate-200 px-6 py-3 rounded-lg font-medium hover:bg-slate-700 transition-colors">
              How Trust Is Built
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {[
            { value: 98, suffix: '%', label: 'CONFIDENCE', desc: 'Task Execution Success Rate' },
            { value: 24, prefix: '', suffix: '/7', label: 'AVAILABILITY', desc: 'Always on AI Assistance' },
            { value: 10, suffix: 'k+', label: 'IMPACT', desc: 'Documents Generated Globally' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center hover:border-slate-700 transition-all duration-150"
            >
              <div className="text-3xl font-bold text-emerald-400">
                {inView ? (
                  <CountUp start={0} end={stat.value} duration={0.8} suffix={stat.suffix || ''} prefix={stat.prefix || ''} />
                ) : (
                  '0'
                )}
              </div>
              <div className="text-sm text-slate-400 mt-2">{stat.label}</div>
              <div className="text-xs text-slate-500">{stat.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
