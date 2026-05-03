// src/components/Logo.jsx
// Consistent logo component for entire site

import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';

export default function Logo({ size = 'md', showText = true, linkTo = '/' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const subtextSizeClasses = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm'
  };

  return (
    <Link to={linkTo} className="flex items-center gap-2 group">
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-primary-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300`}>
        <Brain className="w-2/3 h-2/3 text-white" />
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent`}>
            BluSkye Consult
          </span>
          <span className={`${subtextSizeClasses[size]} text-primary-400`}>
            powered by ODUSBABA
          </span>
        </div>
      )}
    </Link>
  );
}
