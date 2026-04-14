import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
    Settings, Loader2, Volume1, SkipForward, SkipBack
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Quality {
    label: string;
    url: string;
}

interface CustomVideoPlayerProps {
    src: string;
    poster?: string;
    qualities?: Quality[];
    onQualityChange?: (url: string) => void;
    currentQuality?: string;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ 
    src, 
    poster, 
    qualities = [], 
    onQualityChange,
    currentQuality
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [showPlayOverlay, setShowPlayOverlay] = useState(false);
    const [isProgressBarHovered, setIsProgressBarHovered] = useState(false);
    
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    const togglePlay = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
            setShowPlayOverlay(true);
            setTimeout(() => setShowPlayOverlay(false), 500);
        }
    }, [isPlaying]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleDurationChange = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (value: number[]) => {
        if (videoRef.current) {
            videoRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setIsMuted(newVolume === 0);
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            videoRef.current.muted = newMuted;
            if (newMuted) {
                setVolume(0);
            } else {
                setVolume(videoRef.current.volume || 1);
            }
        }
    };

    const toggleFullscreen = useCallback((e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    const skip = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            if (isPlaying && !isProgressBarHovered) setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.code === 'Space' || e.code === 'KeyK') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'ArrowRight' || e.code === 'KeyL') {
                skip(10);
                setShowControls(true);
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyJ') {
                skip(-10);
                setShowControls(true);
            } else if (e.code === 'KeyF') {
                toggleFullscreen();
            } else if (e.code === 'KeyM') {
                if (videoRef.current) {
                    const newMuted = !videoRef.current.muted;
                    videoRef.current.muted = newMuted;
                    setIsMuted(newMuted);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, toggleFullscreen]);

    useEffect(() => {
        const handleFSChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        document.addEventListener('webkitfullscreenchange', handleFSChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFSChange);
            document.removeEventListener('webkitfullscreenchange', handleFSChange);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative group w-full aspect-video bg-black overflow-hidden flex items-center justify-center select-none shadow-2xl transition-all duration-500",
                isFullscreen ? "h-screen w-screen rounded-none" : "rounded-xl border border-white/5"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onDoubleClick={toggleFullscreen}
            onClick={togglePlay}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => setIsLoading(false)}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedData={() => setIsLoading(false)}
                playsInline
            />

            {/* Click Overlays for Skip (sides only) */}
            <div className="absolute inset-0 flex z-10 pointer-events-none">
                <div 
                    className="w-[15%] pointer-events-auto cursor-pointer" 
                    onDoubleClick={(e) => { e.stopPropagation(); skip(-10); }}
                />
                <div className="flex-1" />
                <div 
                    className="w-[15%] pointer-events-auto cursor-pointer" 
                    onDoubleClick={(e) => { e.stopPropagation(); skip(10); }}
                />
            </div>

            {/* Centered Large Play/Pause/Loader */}
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <AnimatePresence>
                    {isLoading ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Loader2 className="w-16 h-16 text-white animate-spin drop-shadow-lg" />
                        </motion.div>
                    ) : showPlayOverlay ? (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            className="bg-white/10 backdrop-blur-xl rounded-full p-8 border border-white/20"
                        >
                            {isPlaying ? <Play className="w-12 h-12 text-white fill-white" /> : <Pause className="w-12 h-12 text-white fill-white" />}
                        </motion.div>
                    ) : !isPlaying && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-10 border border-white/20 pointer-events-auto cursor-pointer transition-all hover:scale-110 shadow-2xl"
                            onClick={togglePlay}
                        >
                            <Play className="w-20 h-20 text-white fill-white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Controls Container */}
            <AnimatePresence>
                {showControls && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-end"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Shaded Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

                        <div className="relative z-40 p-1 md:p-3 pointer-events-auto space-y-0.5 md:space-y-1">
                            
                            {/* YouTube Style Progress Bar */}
                            <div 
                                className="px-2 pt-2 group/progress"
                                onMouseEnter={() => setIsProgressBarHovered(true)}
                                onMouseLeave={() => setIsProgressBarHovered(false)}
                            >
                                <Slider
                                    value={[currentTime]}
                                    max={duration}
                                    step={0.1}
                                    onValueChange={handleSeek}
                                    className="cursor-pointer"
                                    //@ts-ignore
                                    trackClassName={cn(
                                        "transition-all duration-200 bg-white/30",
                                        isProgressBarHovered ? "h-1.5" : "h-1"
                                    )}
                                    rangeClassName="bg-white"
                                    thumbClassName={cn(
                                        "w-4 h-4 bg-white border-0 shadow-lg transition-transform duration-200",
                                        isProgressBarHovered ? "scale-100" : "scale-0"
                                    )}
                                />
                            </div>

                            {/* Control Buttons Row */}
                            <div className="flex items-center justify-between px-1 md:px-2 pb-1">
                                <div className="flex items-center gap-1.5 md:gap-4">
                                    <button 
                                        onClick={toggleFullscreen} 
                                        className="text-white p-2 hover:bg-white/10 rounded-full transition-all group/btn"
                                        title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
                                    >
                                        {isFullscreen ? <Minimize className="w-5 h-5 md:w-6 md:h-6" /> : <Maximize className="w-5 h-5 md:w-6 md:h-6" />}
                                    </button>
                                </div>

                                <div className="flex items-center gap-1.5 md:gap-4">
                                    {/* Quality Selector - Prominent & YouTube-like */}
                                    {qualities.length > 1 && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex items-center gap-2 text-white bg-white/20 hover:bg-white/30 px-3 md:px-5 py-2 rounded-xl border border-white/20 transition-all text-[12px] md:text-[14px] font-bold group shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <span className="text-[9px] uppercase tracking-tighter opacity-60">Quality</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] md:text-xs bg-white text-black px-1.5 rounded-sm font-black">HD</span>
                                                            {currentQuality || (qualities.find(q => q.url === src)?.label) || '1080p'}
                                                        </div>
                                                    </div>
                                                    <Settings className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-500 opacity-80" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-[#0f0f0f]/98 backdrop-blur-3xl border-white/10 text-white min-w-[200px] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl">
                                                <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.2em] text-gray-400 px-4 py-3">
                                                    Select Resolution / اختر الجودة
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-white/5" />
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                                    {qualities.map((q) => {
                                                        const isHD = parseInt(q.label) >= 720 || q.label.toLowerCase().includes('hd');
                                                        return (
                                                            <DropdownMenuItem
                                                                key={q.url}
                                                                onClick={() => onQualityChange?.(q.url)}
                                                                className={cn(
                                                                    "flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer text-sm font-semibold transition-all mb-1 last:mb-0 group/item border border-transparent",
                                                                    src === q.url 
                                                                        ? "bg-white text-black shadow-lg" 
                                                                        : "hover:bg-white/10 hover:border-white/5"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-2 h-2 rounded-full",
                                                                        src === q.url ? "bg-black" : "bg-white/20"
                                                                    )} />
                                                                    <span className="tracking-wide">{q.label}</span>
                                                                    {isHD && <span className={cn(
                                                                        "text-[9px] px-1 rounded-sm font-black border",
                                                                        src === q.url ? "border-black/20 text-black/60" : "border-white/20 text-white/40"
                                                                    )}>HD</span>}
                                                                </div>
                                                                {src === q.url && <motion.div layoutId="active-dot" className="w-1.5 h-1.5 rounded-full bg-black" />}
                                                            </DropdownMenuItem>
                                                        );
                                                    })}
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}

                                    <div className="text-white text-[11px] md:text-[13px] font-medium tracking-tight opacity-90 ml-1 md:ml-2">
                                        <span className="font-mono">{formatTime(currentTime)}</span>
                                        <span className="mx-1.5 opacity-40">/</span>
                                        <span className="opacity-60 font-mono">{formatTime(duration)}</span>
                                    </div>

                                    <div className="flex items-center gap-1 group/volume">
                                        <button onClick={toggleMute} className="text-white p-2 hover:bg-white/10 rounded-full transition-all">
                                            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : volume < 0.5 ? <Volume1 className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                        </button>
                                        <div className="w-0 group-hover/volume:w-16 md:group-hover/volume:w-24 overflow-hidden transition-all duration-300 ml-1">
                                            <Slider
                                                value={[isMuted ? 0 : volume]}
                                                max={1}
                                                step={0.01}
                                                onValueChange={handleVolumeChange}
                                                className="w-16 md:w-24"
                                                //@ts-ignore
                                                trackClassName="h-1 bg-white/30"
                                                rangeClassName="bg-white"
                                                thumbClassName="w-3 h-3 bg-white"
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={togglePlay} 
                                        className="text-white p-2 hover:bg-white/10 rounded-full transition-all group/btn"
                                        title={isPlaying ? "Pause (k)" : "Play (k)"}
                                    >
                                        {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6 fill-white" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-white" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomVideoPlayer;
