import { motion } from 'framer-motion';
import logo from '/BluSkye.png';  // ← Directly in public folder

export default function Logo() {
  return (
    <motion.div 
      className="flex items-center gap-2 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      <img 
        src={logo} 
        alt="BluSkye Integrated Consult" 
        className="w-10 h-10 object-contain"
      />
      <div>
        <div className="font-bold text-xl tracking-tight text-white">BluSkye Integrated Consult</div>
        <div className="text-xs text-slate-400 -mt-0.5">powered by <span className="text-emerald-400 font-medium">ODUSBABA</span> intelligence</div>
      </div>
    </motion.div>
  );
}
