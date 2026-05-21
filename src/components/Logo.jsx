// src/components/Logo.jsx
// COMPLETE LOGO COMPONENT - With fallback, multiple sizes, and responsive design

import { Link } from 'react-router-dom';
import { Brain, Sparkles } from 'lucide-react';

export default function Logo({ size = 'md', showText = true, linkTo = '/', variant = 'default' }) {
    // Size mappings - responsive and scalable
    const sizes = {
        sm: {
            container: 'gap-2',
            icon: 'w-8 h-8',
            text: 'text-xs sm:text-sm',
            subtext: 'text-[9px] sm:text-[10px]',
            iconBg: 'rounded-lg'
        },
        md: {
            container: 'gap-2.5 sm:gap-3',
            icon: 'w-10 h-10',
            text: 'text-sm sm:text-base',
            subtext: 'text-[10px] sm:text-xs',
            iconBg: 'rounded-xl'
        },
        lg: {
            container: 'gap-3 sm:gap-4',
            icon: 'w-12 h-12 sm:w-14 sm:h-14',
            text: 'text-base sm:text-lg',
            subtext: 'text-xs sm:text-sm',
            iconBg: 'rounded-xl'
        },
        xl: {
            container: 'gap-4 sm:gap-5',
            icon: 'w-16 h-16 sm:w-20 sm:h-20',
            text: 'text-lg sm:text-2xl',
            subtext: 'text-sm sm:text-base',
            iconBg: 'rounded-2xl'
        }
    };

    // Variant configurations
    const variants = {
        default: {
            gradient: 'from-primary-500 to-sky-500',
            shadow: 'shadow-primary-500/20',
            icon: Brain,
            companyName: 'BluSkye Integrated Consult',
            subtext: 'powered by ODUSBABA intelligence'
        },
        compact: {
            gradient: 'from-primary-600 to-primary-500',
            shadow: 'shadow-primary-500/20',
            icon: Sparkles,
            companyName: 'BluSkye',
            subtext: 'ODUSBABA'
        },
        dark: {
            gradient: 'from-slate-600 to-slate-500',
            shadow: 'shadow-slate-500/20',
            icon: Brain,
            companyName: 'BluSkye Consult',
            subtext: 'ODUSBABA AI'
        }
    };

    const currentSize = sizes[size] || sizes.md;
    const currentVariant = variants[variant] || variants.default;
    const IconComponent = currentVariant.icon;

    // Logo image path (for custom image logo if needed)
    const logoSrc = '/images/BluSkye.png';
    
    // Handle image error - fallback to icon
    const handleImageError = (e) => {
        e.target.style.display = 'none';
        const fallback = e.target.nextSibling;
        if (fallback) fallback.style.display = 'flex';
    };

    // Use image or icon based on variant
    const useImage = variant === 'image';

    return (
        <Link 
            to={linkTo} 
            className={`flex items-center ${currentSize.container} group hover:opacity-90 transition-opacity`}
            aria-label="BluSkye Integrated Consult - Home"
        >
            {/* Logo Icon / Image */}
            {useImage ? (
                <div className="relative">
                    <img 
                        src={logoSrc}
                        alt="BluSkye Consult"
                        className={`${currentSize.icon} object-contain transition-transform duration-200 group-hover:scale-105`}
                        onError={handleImageError}
                    />
                    {/* Fallback if image fails */}
                    <div 
                        className={`${currentSize.icon} bg-gradient-to-br ${currentVariant.gradient} ${currentSize.iconBg} items-center justify-center text-white font-bold hidden text-2xl absolute top-0 left-0`}
                        style={{ display: 'none' }}
                    >
                        BS
                    </div>
                </div>
            ) : (
                <div className={`${currentSize.icon} bg-gradient-to-br ${currentVariant.gradient} ${currentSize.iconBg} flex items-center justify-center shadow-lg ${currentVariant.shadow} group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}>
                    <IconComponent className="w-2/3 h-2/3 text-white" />
                </div>
            )}
            
            {/* Logo Text */}
            {showText && (
                <div className="flex flex-col min-w-0">
                    <span className={`${currentSize.text} font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent whitespace-normal break-words leading-tight`}>
                        {currentVariant.companyName}
                    </span>
                    <span className={`${currentSize.subtext} text-primary-400 whitespace-normal break-words`}>
                        {currentVariant.subtext}
                    </span>
                </div>
            )}
        </Link>
    );
}
