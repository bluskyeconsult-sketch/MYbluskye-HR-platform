import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';

export default function HeroSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20 px-6">
      {/* Animated background glow - Sky Blue themed */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary-400 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Tagline Badge */}
          <span className="inline-block px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-sm mb-6 border border-primary-500/20">
            ✨ Creating Value for Partnership
          </span>

          {/* Main Heading - BluSkye Integrated Consult */}
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
            BluSkye Integrated Consult
          </h1>
          
          {/* Subheading - Powered by ODUSBABA */}
          <p className="text-lg text-slate-400 mt-2">powered by <span className="text-primary-400 font-semibold">ODUSBABA</span> intelligence</p>
          
          {/* Tagline */}
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mt-6">
            The Governed Workforce Platform. Verified skills. Trusted hiring.
          </p>
          
          {/* Description */}
          <p className="text-base text-slate-400 mt-4 max-w-2xl mx-auto">
            An Experience of Value and solution to possible HR realities.
          </p>

          {/* CTA Buttons - Sky Blue Primary */}
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <a href="/jobs" className="btn-primary">
              Browse Jobs
            </a>
            <a href="/workforce" className="btn-secondary">
              Workforce Market
            </a>
            <a href="/contact" className="btn-outline">
              Contact ODUSBABA
            </a>
          </div>
        </motion.div>

        {/* Stats Cards - Centered Grid */}
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-3xl mx-auto">
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
              className="rounded-xl border border-slate-800 bg-slate-950/50 backdrop-blur-sm p-6 text-center hover:border-primary-500/30 transition-all"
            >
              <div className="text-4xl font-bold text-primary-400">
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
