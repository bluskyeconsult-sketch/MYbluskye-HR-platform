// src/components/Logo.jsx
// OPTIMIZED MERGE - Supports images with smart fallback, clean and efficient

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

// Size configurations (shared between image and icon)
const SIZE_CONFIG = {
    sm: {
        icon: 'w-8 h-8',
        text: 'text-xs',
        subtext: 'text-[8px]',
        gap: 'gap-2'
    },
    md: {
        icon: 'w-10 h-10',
        text: 'text-sm sm:text-base',
        subtext: 'text-[9px] sm:text-[10px]',
        gap: 'gap-2.5'
    },
    lg: {
        icon: 'w-12 h-12',
        text: 'text-base sm:text-lg',
        subtext: 'text-[10px] sm:text-xs',
        gap: 'gap-3'
    },
    xl: {
        icon: 'w-16 h-16',
        text: 'text-xl sm:text-2xl',
        subtext: 'text-xs sm:text-sm',
        gap: 'gap-4'
    }
};

// Logo paths (prioritized)
const LOGO_PATHS = [
    '/images/BluSkye.png',
    '/BluSkye.png',
    '/images/BluSkye-logo.png',
    '/logo.png'
];

export default function Logo({ size = 'md', showText = true, linkTo = '/' }) {
    const [useImage, setUseImage] = useState(true);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [currentPath, setCurrentPath] = useState(LOGO_PATHS[0]);
    const [attemptIndex, setAttemptIndex] = useState(0);
    
    const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

    // Try to load image on mount
    useEffect(() => {
        const tryLoadImage = (index = 0) => {
            if (index >= LOGO_PATHS.length) {
                setUseImage(false);
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                setCurrentPath(LOGO_PATHS[index]);
                setUseImage(true);
                setImageLoaded(true);
            };
            img.onerror = () => {
                tryLoadImage(index + 1);
            };
            img.src = LOGO_PATHS[index];
        };
        
        tryLoadImage(0);
    }, []);

    // Logo content (image or icon)
    const LogoContent = useImage && imageLoaded ? (
        <img 
            src={currentPath}
            alt="BluSkye Integrated Consult"
            className={`${config.icon} object-contain group-hover:scale-105 transition-transform duration-300`}
        />
    ) : (
        <div className={`${config.icon} bg-gradient-to-br from-primary-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}>
            <Brain className="w-2/3 h-2/3 text-white" />
        </div>
    );

    // Text content
    const TextContent = showText && (
        <div className="flex flex-col min-w-0">
            <span className={`${config.text} font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent whitespace-normal break-words leading-tight`}>
                BluSkye Integrated Consult
            </span>
            <span className={`${config.subtext} text-primary-400 whitespace-normal break-words`}>
                powered by <span className="font-extrabold text-primary-500">ODUSBABA</span> intelligence
            </span>
        </div>
    );

    return (
        <Link 
            to={linkTo} 
            className={`flex items-center ${config.gap} group`}
            aria-label="BluSkye Integrated Consult - Home"
        >
            {LogoContent}
            {TextContent}
        </Link>
    );
}
