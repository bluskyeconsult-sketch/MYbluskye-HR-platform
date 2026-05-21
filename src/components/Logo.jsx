// src/components/Logo.jsx
// WORKING LOGO COMPONENT - With proper image loading

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Logo({ size = 'md', showText = true, linkTo = '/' }) {
    const [imgError, setImgError] = useState(false);
    
    // Size configurations
    const sizes = {
        sm: {
            icon: 'w-8 h-8',
            text: 'text-sm',
            subtext: 'text-[10px]',
            container: 'gap-2'
        },
        md: {
            icon: 'w-10 h-10',
            text: 'text-base',
            subtext: 'text-xs',
            container: 'gap-2.5'
        },
        lg: {
            icon: 'w-12 h-12',
            text: 'text-lg',
            subtext: 'text-sm',
            container: 'gap-3'
        },
        xl: {
            icon: 'w-16 h-16',
            text: 'text-2xl',
            subtext: 'text-base',
            container: 'gap-4'
        }
    };

    const current = sizes[size] || sizes.md;
    
    // Try multiple possible paths
    const logoPaths = [
        '/images/BluSkye.png',
        '/BluSkye.png',
        '/images/BluSkye-logo.png',
        '/logo.png',
        '/assets/BluSkye.png'
    ];
    
    const [currentPath, setCurrentPath] = useState(logoPaths[0]);
    const [pathIndex, setPathIndex] = useState(0);

    // Try next path if current fails
    const handleImageError = () => {
        if (pathIndex + 1 < logoPaths.length) {
            setPathIndex(pathIndex + 1);
            setCurrentPath(logoPaths[pathIndex + 1]);
        } else {
            setImgError(true);
        }
    };

    // Check if image exists on mount
    useEffect(() => {
        const img = new Image();
        img.onload = () => console.log('✅ Logo loaded:', currentPath);
        img.onerror = () => console.error('❌ Logo not found at:', currentPath);
        img.src = currentPath;
    }, [currentPath]);

    // Fallback when image fails
    if (imgError) {
        return (
            <Link to={linkTo} className={`flex items-center ${current.container} group`}>
                <div className={`${current.icon} bg-gradient-to-br from-primary-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform`}>
                    <span className="text-white text-xl font-bold">BS</span>
                </div>
                {showText && (
                    <div className="flex flex-col">
                        <span className={`${current.text} font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent whitespace-nowrap`}>
                            BluSkye Integrated Consult
                        </span>
                        <span className={`${current.subtext} text-primary-400 whitespace-nowrap`}>
                            powered by <span className="font-extrabold text-primary-500">ODUSBABA</span>
                        </span>
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
            />
            {showText && (
                <div className="flex flex-col">
                    <span className={`${current.text} font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent whitespace-nowrap`}>
                        BluSkye Integrated Consult
                    </span>
                    <span className={`${current.subtext} text-primary-400 whitespace-nowrap`}>
                        powered by <span className="font-extrabold text-primary-500">ODUSBABA</span>
                    </span>
                </div>
            )}
        </Link>
    );
}
