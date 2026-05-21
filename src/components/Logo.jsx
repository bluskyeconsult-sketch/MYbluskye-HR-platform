// src/components/Logo.jsx
// OPTIMIZED - Uses actual logo file with fallback to Brain icon if image fails

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

export default function Logo({ size = 'md', showText = true, linkTo = '/' }) {
    const [imgError, setImgError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Size configurations
    const sizes = {
        sm: {
            icon: 'w-8 h-8',
            text: 'text-xs',
            subtext: 'text-[8px]',
            container: 'gap-2'
        },
        md: {
            icon: 'w-10 h-10',
            text: 'text-sm sm:text-base',
            subtext: 'text-[9px] sm:text-[10px]',
            container: 'gap-2.5'
        },
        lg: {
            icon: 'w-12 h-12',
            text: 'text-base sm:text-lg',
            subtext: 'text-[10px] sm:text-xs',
            container: 'gap-3'
        },
        xl: {
            icon: 'w-16 h-16',
            text: 'text-xl sm:text-2xl',
            subtext: 'text-xs sm:text-sm',
            container: 'gap-4'
        }
    };

    const current = sizes[size] || sizes.md;
    
    // Multiple possible paths for the logo (ordered by priority)
    const logoPaths = [
        '/images/BluSkye.png',
        '/BluSkye.png',
        '/images/BluSkye-logo.png',
        '/logo.png',
        '/assets/BluSkye.png',
        '/assets/images/BluSkye.png'
    ];
    
    const [currentPath, setCurrentPath] = useState(logoPaths[0]);
    const [pathIndex, setPathIndex] = useState(0);

    // Try next path if current fails
    const handleImageError = () => {
        if (pathIndex + 1 < logoPaths.length) {
            const nextIndex = pathIndex + 1;
            setPathIndex(nextIndex);
            setCurrentPath(logoPaths[nextIndex]);
        } else {
            console.warn('Logo image not found at any path, using fallback');
            setImgError(true);
        }
        setIsLoading(false);
    };

    const handleImageLoad = () => {
        console.log('✅ Logo loaded successfully:', currentPath);
        setIsLoading(false);
    };

    // Preload images on mount
    useEffect(() => {
        const testImage = (index = 0) => {
            if (index >= logoPaths.length) {
                setImgError(true);
                setIsLoading(false);
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                setCurrentPath(logoPaths[index]);
                setPathIndex(index);
                setIsLoading(false);
                console.log('✅ Logo found at:', logoPaths[index]);
            };
            img.onerror = () => {
                console.log('Logo not found at:', logoPaths[index]);
                testImage(index + 1);
            };
            img.src = logoPaths[index];
        };
        
        testImage(0);
    }, []);

    // Fallback using Brain icon when image fails
    if (imgError) {
        return (
            <Link to={linkTo} className={`flex items-center ${current.container} group`}>
                <div className={`${current.icon} bg-gradient-to-br from-primary-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0`}>
                    <Brain className="w-2/3 h-2/3 text-white" />
                </div>
                {showText && (
                    <div className="flex flex-col min-w-0">
                        <span className={`${current.text} font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent whitespace-normal break-words leading-tight`}>
                            BluSkye Integrated Consult
                        </span>
                        <span className={`${current.subtext} text-primary-400 whitespace-normal break-words`}>
                            powered by <span className="font-extrabold text-primary-500">ODUSBABA</span> intelligence
                        </span>
                    </div>
                )}
            </Link>
        );
    }

    // Show loading state
    if (isLoading) {
        return (
            <Link to={linkTo} className={`flex items-center ${current.container} group`}>
                <div className={`${current.icon} bg-slate-800 rounded-xl animate-pulse flex-shrink-0`}></div>
                {showText && (
                    <div className="flex flex-col min-w-0">
                        <div className="h-4 bg-slate-800 rounded animate-pulse w-32 mb-1"></div>
                        <div className="h-2 bg-slate-800 rounded animate-pulse w-24"></div>
                    </div>
                )}
            </Link>
        );
    }

    return (
        <Link to={linkTo} className={`flex items-center ${current.container} group`}>
            <img 
                src={currentPath}
                alt="BluSkye Integrated Consult"
                className={`${current.icon} object-contain group-hover:scale-105 transition-transform duration-300`}
                onError={handleImageError}
                onLoad={handleImageLoad}
            />
            {showText && (
                <div className="flex flex-col min-w-0">
                    <span className={`${current.text} font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent whitespace-normal break-words leading-tight`}>
                        BluSkye Integrated Consult
                    </span>
                    <span className={`${current.subtext} text-primary-400 whitespace-normal break-words`}>
                        powered by <span className="font-extrabold text-primary-500">ODUSBABA</span> intelligence
                    </span>
                </div>
            )}
        </Link>
    );
}
