// src/components/Logo.jsx
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', showText = true, linkTo = '/' }) {
  // Size mappings
  const sizes = {
    sm: { img: 'w-8 h-8', text: 'text-base', container: 'gap-1.5' },
    md: { img: 'w-10 h-10', text: 'text-xl', container: 'gap-2' },
    lg: { img: 'w-12 h-12', text: 'text-2xl', container: 'gap-3' }
  };
  
  const currentSize = sizes[size] || sizes.md;
  
  // Your actual logo path (already uploaded to public/images/BluSkye.png)
  const logoSrc = '/images/BluSkye.png';
  
  // Handle image error - show fallback
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    const fallback = e.target.nextSibling;
    if (fallback) fallback.style.display = 'flex';
  };
  
  return (
    <Link to={linkTo} className={`flex items-center ${currentSize.container} group`}>
      <div className="relative">
        <img 
          src={logoSrc}
          alt="BluSkye Consult"
          className={`${currentSize.img} object-contain transition-transform duration-200 group-hover:scale-105`}
          onError={handleImageError}
        />
        {/* Fallback text if image fails to load */}
        <div 
          className={`${currentSize.img} bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg items-center justify-center text-white font-bold hidden`}
          style={{ display: 'none' }}
        >
          BS
        </div>
      </div>
      {showText && (
        <div>
          <span className={`${currentSize.text} font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent`}>
            BluSkye Consult
          </span>
          <p className="text-[10px] text-primary-400 -mt-1 leading-tight">powered by ODUSBABA</p>
        </div>
      )}
    </Link>
  );
}
