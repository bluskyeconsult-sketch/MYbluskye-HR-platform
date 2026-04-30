import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function AnimatedBackground() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (dimensions.width === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-emerald-500/30 rounded-full"
          initial={{ x: Math.random() * dimensions.width, y: Math.random() * dimensions.height, opacity: 0 }}
          animate={{ y: [null, -80, -160], opacity: [0.2, 0.5, 0] }}
          transition={{ duration: 5 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5, ease: "linear" }}
        />
      ))}
      <motion.div className="absolute top-20 left-10 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl" animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute bottom-20 right-10 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" animate={{ scale: [1, 1.3, 1], x: [0, -40, 0], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
    </div>
  );
}
