import { motion } from 'framer-motion';

export default function Logo() {
  // Using absolute URL - replace with your actual URL if different
  const logoUrl = 'https://raw.githubusercontent.com/bluskyeconsult-sketch/MYbluskye-HR-platform/main/BluSkye.png';

  return (
    <motion.div 
      className="flex items-center gap-3 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      {/* Logo Image - INCREASED SIZE */}
      <img 
        src={logoUrl} 
        alt="BluSkye Integrated Consult" 
        className="w-14 h-14 md:w-16 md:h-16 object-contain"
      />
      <div>
        <div className="font-bold text-xl md:text-2xl tracking-tight text-white">BluSkye Integrated Consult</div>
        <div className="text-xs md:text-sm text-slate-400 -mt-0.5">powered by <span className="text-emerald-400 font-medium">ODUSBABA</span> intelligence</div>
      </div>
    </motion.div>
  );
}
