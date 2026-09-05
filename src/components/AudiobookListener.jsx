// src/components/AudiobookListener.jsx
//
// NEW (2026-09-04) — a real, complete audiobook player for book
// chapters. Plays through audio_segments (a JSON array of
// {part, url, duration} objects, since long chapters are split into
// multiple TTS-safe files by the backend rather than one file) in
// sequence, auto-advancing when each segment finishes. Matches the
// established design and interaction quality of BookReader.jsx.

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Loader2 } from 'lucide-react';

export default function AudiobookListener({ segments = [], chapterTitle = '', onClose }) {
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef(null);

    const currentSegment = segments[currentSegmentIndex];
    const totalDuration = segments.reduce((sum, s) => sum + (s.duration || 0), 0);
    const elapsedBeforeCurrent = segments.slice(0, currentSegmentIndex).reduce((sum, s) => sum + (s.duration || 0), 0);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate, currentSegmentIndex]);

    useEffect(() => {
        // Auto-play the next segment when one finishes, so a full
        // chapter plays through continuously rather than stopping
        // after each individual TTS-generated file.
        if (isPlaying && audioRef.current) {
            audioRef.current.play().catch(() => setIsPlaying(false));
        }
    }, [currentSegmentIndex]);

    function togglePlay() {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }

    function handleEnded() {
        if (currentSegmentIndex < segments.length - 1) {
            setCurrentSegmentIndex(currentSegmentIndex + 1);
        } else {
            setIsPlaying(false);
        }
    }

    function skipToSegment(index) {
        if (index < 0 || index >= segments.length) return;
        setCurrentSegmentIndex(index);
        setIsLoading(true);
    }

    function handleSeek(e) {
        if (!audioRef.current) return;
        const newTime = parseFloat(e.target.value);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    if (!segments || segments.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm">
                    Audio narration hasn't been generated for this chapter yet.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-white font-semibold">{chapterTitle || 'Chapter Audio'}</h3>
                    <p className="text-xs text-slate-500">
                        Part {currentSegmentIndex + 1} of {segments.length}
                    </p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
                        Close
                    </button>
                )}
            </div>

            <audio
                ref={audioRef}
                src={currentSegment?.url}
                onLoadedMetadata={(e) => { setDuration(e.target.duration); setIsLoading(false); }}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onEnded={handleEnded}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => setIsLoading(false)}
            />

            {/* Overall chapter progress, across all segments */}
            <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{formatTime(elapsedBeforeCurrent + currentTime)}</span>
                    <span>{formatTime(totalDuration)}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all"
                        style={{ width: totalDuration > 0 ? `${((elapsedBeforeCurrent + currentTime) / totalDuration) * 100}%` : '0%' }}
                    />
                </div>
            </div>

            {/* Current segment seek bar */}
            <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full mb-4 accent-primary-500"
            />

            <div className="flex items-center justify-center gap-4 mb-4">
                <button
                    onClick={() => skipToSegment(currentSegmentIndex - 1)}
                    disabled={currentSegmentIndex === 0}
                    className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition"
                >
                    <SkipBack className="w-5 h-5" />
                </button>

                <button
                    onClick={togglePlay}
                    className="p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition"
                >
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-6 h-6" />
                    ) : (
                        <Play className="w-6 h-6" />
                    )}
                </button>

                <button
                    onClick={() => skipToSegment(currentSegmentIndex + 1)}
                    disabled={currentSegmentIndex === segments.length - 1}
                    className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition"
                >
                    <SkipForward className="w-5 h-5" />
                </button>
            </div>

            <div className="flex items-center justify-center gap-2">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">Speed</span>
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        className={`px-2 py-1 rounded text-xs transition ${
                            playbackRate === rate
                                ? 'bg-primary-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                    >
                        {rate}x
                    </button>
                ))}
            </div>
        </div>
    );
}
