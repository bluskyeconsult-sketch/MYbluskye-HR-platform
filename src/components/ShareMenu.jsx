// src/components/ShareMenu.jsx
//
// NEW (2026-09-19): reusable share dropdown with explicit links to
// major channels (WhatsApp, Facebook, X/Twitter, LinkedIn, Email),
// plus copy-link - genuinely more reliable than depending solely on
// navigator.share(), which only exists on some mobile browsers and
// never on desktop Chrome/Firefox.

import { useState, useRef, useEffect } from 'react';
import { Share2, X, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareMenu({ url, title, text }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
        }
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const shareText = text || title || '';

    const channels = [
        {
            name: 'WhatsApp',
            color: 'hover:bg-emerald-500/10 hover:text-emerald-400',
            href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
        },
        {
            name: 'Facebook',
            color: 'hover:bg-blue-500/10 hover:text-blue-400',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'X (Twitter)',
            color: 'hover:bg-slate-500/10 hover:text-slate-300',
            href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'LinkedIn',
            color: 'hover:bg-sky-500/10 hover:text-sky-400',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'Email',
            color: 'hover:bg-amber-500/10 hover:text-amber-400',
            href: `mailto:?subject=${encodeURIComponent(title || '')}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
        }
    ];

    async function handleCopyLink() {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy link');
        }
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen(!open)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                aria-label="Share"
            >
                <Share2 className="w-5 h-5 text-slate-300" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="flex justify-between items-center px-3 py-2 border-b border-slate-800">
                        <p className="text-white text-sm font-medium">Share</p>
                        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {channels.map(channel => (
                        <a
                            key={channel.name}
                            href={channel.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpen(false)}
                            className={`block px-3 py-2 text-sm text-slate-300 transition ${channel.color}`}
                        >
                            {channel.name}
                        </a>
                    ))}
                    <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition text-left border-t border-slate-800"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy link'}
                    </button>
                </div>
            )}
        </div>
    );
}
