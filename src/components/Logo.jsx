import { motion } from 'framer-motion';
import logo from '../assets/BluSkye'; // ← CHANGE THIS to your actual file name

export default function Logo() {
  return (
    <motion.div 
      className="flex items-center gap-2 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      {/* Your actual logo image */}
      <img 
        src={logo} 
        alt="BluSkye Logo" 
        className="w-8 h-8 object-contain"
      />
      <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
        ODUSBABA
      </span>
    </motion.div>
  );
}
