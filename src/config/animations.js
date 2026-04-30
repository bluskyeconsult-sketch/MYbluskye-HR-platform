export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: 'easeOut' }
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};

export const scaleHover = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15 }
};

export const borderGlow = {
  whileHover: { borderColor: '#10B981', boxShadow: '0 0 0 1px #10B981' }
};
