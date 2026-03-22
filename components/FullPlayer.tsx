
import React, { useRef, useEffect, useState } from "react";
import { useToast } from "../hooks/useToast";
import { PlayState } from "../types";
import FluidBackground from "./FluidBackground";
import Controls from "./Controls";
import LyricsView from "./LyricsView";
import MediaSessionController from "./MediaSessionController";
import { usePlayerContext } from "../context/PlayerContext";
import { ChevronDown, Sun, Moon, Droplets, Maximize, Minimize } from "lucide-react";
import { flushSync } from "react-dom";
import PlaylistPanel from "./PlaylistPanel";

const FullPlayer: React.FC = () => {
    const {
        currentSong,
        playState,
        currentTime,
        duration,
        playMode,
        togglePlay,
        toggleMode,
        handleSeek,
        playNext,
        playPrev,
        volume,
        setVolume,
        speed,
        setSpeed,
        audioRef,
        setShowFullPlayer,
        showFullPlayer,
        queue,
        playIndex,
        importFromUrl,
        removeSongs,
        matchStatus,
        showPlaylist,
        setShowPlaylist,
        theme,
        setTheme
    } = usePlayerContext();

    // Visual state
    const [showVisualizer, setShowVisualizer] = useState(true);
    const [activePanel, setActivePanel] = useState<"controls" | "lyrics">("controls");
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // We lift these UI states here as they are specific to the full player view
    // showPlaylist is now in context
    const [showVolumePopup, setShowVolumePopup] = useState(false);
    const [showSettingsPopup, setShowSettingsPopup] = useState(false);

    // Persistent color state to prevent flashing
    const [displayColors, setDisplayColors] = useState<string[] | undefined>(currentSong?.colors);
    const [displayAccentColor, setDisplayAccentColor] = useState<string>(currentSong?.colors?.[0] || "#a855f7");

    // Update colors only when we have valid new ones
    useEffect(() => {
        if (currentSong?.colors && currentSong.colors.length > 0) {
            setDisplayColors(currentSong.colors);
            setDisplayAccentColor(currentSong.colors[0]);
        }
    }, [currentSong?.colors]);

    // Detect mobile layout
    useEffect(() => {
        if (typeof window === "undefined") return;
        const query = window.matchMedia("(max-width: 1024px)");
        const updateLayout = (event: MediaQueryListEvent | MediaQueryList) => {
            setIsMobileLayout(event.matches);
        };
        updateLayout(query);
        query.addEventListener("change", updateLayout);
        return () => query.removeEventListener("change", updateLayout);
    }, []);

    // Listen to fullscreen changes outside of react
    useEffect(() => {
        const onFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", onFullScreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", onFullScreenChange);
        };
    }, []);

    // Close handling - different behavior per theme
    const [isClosing, setIsClosing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (showFullPlayer) {
            setIsVisible(true);
            setIsClosing(false);
        }
    }, [showFullPlayer]);

    const handleClose = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.warn(err));
        }
        setIsClosing(true);

        if (theme === 'fluid') {
            // Crossfade: immediately let MainLayout fade in, FullPlayer fades out
            setShowFullPlayer(false);
            setTimeout(() => {
                setIsVisible(false);
                setIsClosing(false);
            }, 400);
        } else {
            // Slide down: wait for animation, then hide
            setTimeout(() => {
                setShowFullPlayer(false);
                setIsVisible(false);
                setIsClosing(false);
            }, 300);
        }
    };

    const cycleTheme = () => {
        const nextTheme = theme === 'fluid' ? 'light' : theme === 'light' ? 'dark' : 'fluid';

        if (!document.startViewTransition) {
            setTheme(nextTheme);
            return;
        }

        document.startViewTransition(() => {
            flushSync(() => {
                setTheme(nextTheme);
            });
        });
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    if (!isVisible) return null;

    // Choose animation class based on theme
    const getAnimClass = () => {
        if (theme === 'fluid') {
            return isClosing ? 'animate-fade-out' : 'animate-fade-in';
        }
        return isClosing ? 'animate-slide-down' : 'animate-slide-up';
    };

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col ${getAnimClass()} ${theme === 'fluid' ? 'bg-transparent' : 'bg-black'}`}>
            {/* Background placeholder removed to allow GlobalBackground to show through until FluidBackground loads */}

            <style>{`
                @keyframes slideInUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideOutDown {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(100%); opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                .animate-slide-up {
                    animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-slide-down {
                    animation: slideOutDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                .animate-fade-out {
                    animation: fadeOut 0.4s ease-out forwards;
                }
            `}</style>

            {/* Top Action Buttons */}
            <div className="absolute top-4 left-4 z-50 flex gap-4">
                <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors text-white"
                    title="Close Full Player"
                >
                    <ChevronDown size={24} />
                </button>
                <button
                    onClick={cycleTheme}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors text-white"
                    title="Change Theme"
                >
                    {theme === 'fluid' ? <Droplets size={24} /> : theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
                </button>
            </div>

            {/* Top Right Action Buttons */}
            <div className="absolute top-4 right-4 z-50 flex gap-4">
                <button
                    onClick={toggleFullScreen}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors text-white"
                    title="Toggle Full Screen"
                >
                    {isFullScreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
            </div>


            {/* Global KeyboardShortcuts are mounted in MainLayout */}

            <MediaSessionController
                currentSong={currentSong ?? null}
                playState={playState}
                currentTime={currentTime}
                duration={duration}
                playbackRate={speed}
                onPlay={() => { }} // Handled by context
                onPause={() => { }} // Handled by context
                onNext={playNext}
                onPrev={playPrev}
                onSeek={handleSeek}
            />

            <div className="flex-1 grid lg:grid-cols-2 w-full h-full relative z-10">
                {/* Controls Section */}
                <div className="flex flex-col items-center justify-center w-full h-full p-4">
                    <div className="relative flex flex-col items-center gap-8 w-full max-w-[360px] lg:max-w-[480px]">
                        <Controls
                            isPlaying={playState === PlayState.PLAYING}
                            onPlayPause={togglePlay}
                            currentTime={currentTime}
                            duration={duration}
                            onSeek={handleSeek}
                            title={currentSong?.title || "Welcome to Aura"}
                            artist={currentSong?.artist || "Select a song"}
                            audioRef={audioRef}
                            onNext={playNext}
                            onPrev={playPrev}
                            playMode={playMode}
                            onToggleMode={toggleMode}
                            onTogglePlaylist={() => setShowPlaylist(!showPlaylist)}
                            accentColor={displayAccentColor}
                            volume={volume}
                            onVolumeChange={setVolume}
                            speed={speed}
                            preservesPitch={true} // Fixed for now
                            onSpeedChange={setSpeed}
                            onTogglePreservesPitch={() => { }}
                            coverUrl={currentSong?.coverUrl}
                            isBuffering={false} // Todo: expose buffering from context
                            showVolumePopup={showVolumePopup}
                            setShowVolumePopup={setShowVolumePopup}
                            showSettingsPopup={showSettingsPopup}
                            setShowSettingsPopup={setShowSettingsPopup}
                            showVisualizer={showVisualizer}
                            onToggleVisualizer={() => setShowVisualizer((prev) => !prev)}
                        />
                    </div>
                </div>

                {/* Lyrics Section */}
                <div className="w-full h-full flex flex-col justify-center px-4 lg:pl-12">
                    <LyricsView
                        key={`${currentSong?.id}-${currentSong?.lyrics?.length || 0}`}
                        lyrics={currentSong?.lyrics || []}
                        audioRef={audioRef}
                        isPlaying={playState === PlayState.PLAYING}
                        currentTime={currentTime}
                        onSeekRequest={handleSeek}
                        matchStatus={matchStatus}
                    />
                </div>
            </div>

            {/* Playlist Sidebar Overlay (Local to FullPlayer) */}
            {showPlaylist && (
                <div className="absolute inset-x-0 top-0 bottom-0 z-[120] bg-white/10 backdrop-blur-sm flex justify-end animate-in fade-in duration-300 text-white">
                    <div className="w-full max-w-sm h-full bg-white/10 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-300">
                        <div className="p-4 flex items-center justify-between border-b border-white/10">
                            <h2 className="text-xl font-bold">Queue</h2>
                            <button
                                onClick={() => setShowPlaylist(false)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <ChevronDown size={20} className="rotate-[-90deg]" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <PlaylistPanel
                                isOpen={showPlaylist}
                                onClose={() => setShowPlaylist(false)}
                                queue={queue}
                                currentSongId={currentSong?.id}
                                onPlay={playIndex}
                                onImport={importFromUrl}
                                onRemove={removeSongs}
                                accentColor={displayAccentColor}
                                className="w-full h-full bg-transparent shadow-none border-none p-0 overflow-hidden flex flex-col"
                                style={{ maxHeight: 'none', borderRadius: 0, position: 'relative', bottom: 'auto', right: 'auto' }}
                            />
                        </div>
                    </div>
                    {/* Backdrop click to close */}
                    <div
                        className="absolute inset-0 -z-10"
                        onClick={() => setShowPlaylist(false)}
                    />
                </div>
            )}

        </div>
    );
};

export default FullPlayer;
