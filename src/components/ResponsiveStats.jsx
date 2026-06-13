// src/components/ResponsiveStats.jsx
// Example of properly responsive stats component

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';

export default function ResponsiveStats({ stats, loading = false }) {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
    
    if (loading) {
        return (
            <div className="grid-responsive">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="card-responsive bg-slate-800/30 animate-pulse">
                        <div className="h-8 w-20 bg-slate-700 rounded mx-auto mb-2"></div>
                        <div className="h-4 w-24 bg-slate-700 rounded mx-auto"></div>
                    </div>
                ))}
            </div>
        );
    }
    
    return (
        <div ref={ref} className="grid-responsive">
            {stats.map((stat, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className="card-responsive bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700 text-center hover:border-primary-500/30 transition-all"
                >
                    <div className="stats-number text-primary-400">
                        {inView ? (
                            <CountUp start={0} end={stat.value} duration={1.5} suffix={stat.suffix || '+'} />
                        ) : (
                            `0${stat.suffix || '+'}`
                        )}
                    </div>
                    <div className="text-responsive-sm text-slate-400 mt-1">{stat.label}</div>
                    {stat.subtext && (
                        <div className="text-responsive-xs text-slate-500 mt-1">{stat.subtext}</div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
