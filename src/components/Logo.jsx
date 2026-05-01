import { motion } from 'framer-motion';

export default function Logo() {
  // Path to logo in public/images/ folder
  const logoUrl = '/images/BluSkye.png';

  return (
    <motion.div 
      className="flex items-center gap-3 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      <img 
        src={logoUrl} 
        alt="BluSkye Integrated Consult" 
        className="w-14 h-14 md:w-16 md:h-16 object-contain"
        onError={(e) => {
          console.error('Logo failed to load:', e.target.src);
          e.target.style.display = 'none';
        }}
      />
      <div>
        <div className="font-bold text-xl md:text-2xl tracking-tight text-white">BluSkye Integrated Consult</div>
        <div className="text-xs md:text-sm text-slate-400 -mt-0.5">powered by <span className="text-emerald-400 font-medium">ODUSBABA</span> intelligence</div>
      </div>
    </motion.div>
  );
}
