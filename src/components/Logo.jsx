import { motion } from 'framer-motion';

export default function Logo() {
  return (
    <motion.div 
      className="flex items-center gap-2 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      {/* Logo Icon - Replace with your actual logo image when available */}
      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-lg flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-sm">OD</span>
      </div>
      <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
        ODUSBABA
      </span>
    </motion.div>
  );
}
