import { motion } from 'framer-motion';

export default function Logo() {
  return (
    <motion.div 
      className="flex items-center gap-2 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      {/* Logo Icon */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg">
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <div>
        <div className="font-bold text-xl tracking-tight text-white">BluSkye Integrated Consult</div>
        <div className="text-xs text-slate-400 -mt-0.5">powered by <span className="text-emerald-400 font-medium">ODUSBABA</span> intelligence</div>
      </div>
    </motion.div>
  );
}
