// src/components/AnimatedBackground.jsx
import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrolled = window.scrollY;
        containerRef.current.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1
  }));

  const orbs = [
    { size: 300, color: 'from-primary-500/20', top: '10%', left: '-10%', delay: 0 },
    { size: 400, color: 'from-purple-500/15', top: '60%', left: '80%', delay: 2 },
    { size: 250, color: 'from-cyan-500/15', top: '30%', left: '60%', delay: 4 },
    { size: 350, color: 'from-emerald-500/10', top: '70%', left: '20%', delay: 1 },
    { size: 200, color: 'from-amber-500/10', top: '20%', left: '30%', delay: 3 },
    { size: 280, color: 'from-pink-500/10', top: '50%', left: '50%', delay: 5 }
  ];

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient Orbs */}
      {orbs.map((orb, idx) => (
        <div
          key={idx}
          className={`absolute rounded-full bg-gradient-to-r ${orb.color} to-transparent blur-3xl animate-float`}
          style={{
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            top: orb.top,
            left: orb.left,
            animationDelay: `${orb.delay}s`,
            opacity: 0.4
          }}
        />
      ))}
      
      {/* Floating Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: particle.left,
            top: particle.top,
            opacity: particle.opacity,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            willChange: 'transform'
          }}
        />
      ))}
      
      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.15) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}
