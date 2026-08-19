// src/components/Logo.jsx
// OPTIMIZED MERGE - Supports images with smart fallback, clean and efficient
//
// FIXED (2026-08-16): the real logo file lives at src/assets/BluSkye.png
// (confirmed via the repo's own file listing) — but this component tried
// to load it via guessed direct URL paths (/BluSkye.png, /images/...),
// which only works for files placed in the public/ folder. Files in
// src/assets/ aren't served at a direct URL at all in Vite unless
// imported as a module, so every one of those guesses would have failed
// and silently fallen back to the Brain icon placeholder — matching every
// screenshot from this entire session, which never showed a real logo.
// Fixed to import the asset properly, which Vite resolves to a real,
// working URL at build time regardless of folder placement.
//
// Separately: this component was never actually wired into the live
// Navbar/Footer at all — App.jsx's inline Navbar has only ever rendered
// "ODUSBABA" as plain text, no image attempt whatsoever. Fixing this
// component alone doesn't show a logo anywhere until it's actually used.

import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Brain } from 'lucide-react';
import bluskyeLogo from '../assets/BluSkye.png';

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
    },
    // NEW (2026-08-16): 2x the size of xl (64px → 128px), specifically for
    // the navbar per an explicit "still not visible enough" request.
    '2xl': {
        icon: 'w-32 h-32',
        text: 'text-2xl sm:text-3xl',
        subtext: 'text-sm sm:text-base',
        gap: 'gap-4'
    }
};

export default function Logo({ size = 'md', showText = true, linkTo = '/' }) {
    const [imageError, setImageError] = useState(false);
    const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

    // Logo content (image or icon fallback)
    const LogoContent = !imageError ? (
        <img 
            src={bluskyeLogo}
            alt="BluSkye Integrated Consult"
            onError={() => setImageError(true)}
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
