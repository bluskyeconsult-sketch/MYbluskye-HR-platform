// src/components/ShareMenu.jsx
//
// NEW (2026-09-19): reusable share dropdown with explicit links to
// major channels (WhatsApp, Facebook, X/Twitter, LinkedIn, Email),
// plus copy-link - genuinely more reliable than depending solely on
// navigator.share(), which only exists on some mobile browsers and
// never on desktop Chrome/Firefox.
//
// UPDATED (2026-10-19): every share now carries a matching caption and hashtags.
//   - X gets a caption that fits with the link, plus real hashtags.
//   - WhatsApp and email get the caption (no hashtags, they do not use them).
//   - "Copy post caption" copies caption + link + hashtags for LinkedIn, Facebook
//     and Instagram, which ignore pre-filled text from a share link.
// What is being shared is worked out from the page address, so existing uses
// of <ShareMenu url title text /> keep working unchanged. Optional extras:
//   kind      'job' | 'article' | 'course' | 'book' | 'assessment' | 'tool' | 'va' | 'generic'
//   details   { company, location, category, tags, author, excerpt }
//   caption   a caption saved by the admin (wins over the generated one)
//   hashtags  hashtags saved by the admin (array, with or without '#')

import { useState, useRef, useEffect } from 'react';
import { Share2, X, Copy, Check, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildShare, inferKind, withUtm } from '../lib/shareCaption';
import { trackShare } from '../lib/shareTracking';

export default function ShareMenu({ url, title, text, kind, details, caption, hashtags }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedPost, setCopiedPost] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
        }
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const resolvedKind = kind || inferKind(typeof window !== 'undefined' ? window.location.pathname : '');

    // Each channel gets its own tracking tags (utm_source=whatsapp, linkedin...) so analytics can show
    // which channel brought each visitor. The copied caption is tagged copy_caption.
    const linkFor = (source) => withUtm(shareUrl, source, resolvedKind);

    // Cheap string work, so it is simply rebuilt on each render.
    const share = buildShare({
        kind: resolvedKind,
        title,
        url: linkFor('copy_caption'),
        text,
        details,
        saved: { caption, hashtags }
    });

    const channels = [
        {
            name: 'WhatsApp',
            id: 'whatsapp',
            color: 'hover:bg-emerald-500/10 hover:text-emerald-400',
            href: `https://wa.me/?text=${encodeURIComponent(`${share.plainText} ${linkFor('whatsapp')}`)}`
        },
        {
            name: 'Facebook',
            id: 'facebook',
            color: 'hover:bg-blue-500/10 hover:text-blue-400',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkFor('facebook'))}`
        },
        {
            name: 'X (Twitter)',
            id: 'twitter',
            color: 'hover:bg-slate-500/10 hover:text-slate-300',
            href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(share.xText)}&url=${encodeURIComponent(linkFor('twitter'))}&hashtags=${encodeURIComponent(share.xHashtags)}`
        },
        {
            name: 'LinkedIn',
            id: 'linkedin',
            color: 'hover:bg-sky-500/10 hover:text-sky-400',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(linkFor('linkedin'))}`
        },
        {
            name: 'Email',
            id: 'email',
            color: 'hover:bg-amber-500/10 hover:text-amber-400',
            href: `mailto:?subject=${encodeURIComponent(title || share.caption)}&body=${encodeURIComponent(`${share.plainText}\n\n${linkFor('email')}`)}`
        }
    ];

    const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    // The phone's own share sheet: reaches Instagram, Telegram, Messenger, SMS and every other app installed.
    async function handleNativeShare() {
        trackShare({ kind: resolvedKind, channel: 'native', url: shareUrl });
        setOpen(false);
        try {
            await navigator.share({ title: title || share.caption, text: share.plainText, url: linkFor('native') });
        } catch (e) { /* the visitor closed the share sheet */ }
    }

    async function handleCopyLink() {
        trackShare({ kind: resolvedKind, channel: 'copy_link', url: shareUrl });
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy link');
        }
    }

    async function handleCopyPost() {
        trackShare({ kind: resolvedKind, channel: 'copy_caption', url: shareUrl });
        try {
            await navigator.clipboard.writeText(share.copyText);
            setCopiedPost(true);
            toast.success('Caption and hashtags copied. Paste them into your post.');
            setTimeout(() => setCopiedPost(false), 2000);
        } catch {
            toast.error('Could not copy the caption');
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
                            onClick={() => { trackShare({ kind: resolvedKind, channel: channel.id, url: shareUrl }); setOpen(false); }}
                            className={`block px-3 py-2 text-sm text-slate-300 transition ${channel.color}`}
                        >
                            {channel.name}
                        </a>
                    ))}
                    {canNativeShare && (
                        <button
                            onClick={handleNativeShare}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition text-left"
                        >
                            More apps...
                        </button>
                    )}
                    <button
                        onClick={handleCopyPost}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition text-left border-t border-slate-800"
                        title="Copies the caption, link and hashtags - best for LinkedIn, Facebook and Instagram"
                    >
                        {copiedPost ? <Check className="w-4 h-4 text-emerald-400" /> : <Hash className="w-4 h-4" />}
                        {copiedPost ? 'Copied!' : 'Copy post caption'}
                    </button>
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
