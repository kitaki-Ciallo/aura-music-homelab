
import React, { useRef, useEffect, useState } from "react";
import { useToast } from "../hooks/useToast";
import { PlayState } from "../types";
import FluidBackground from "./FluidBackground";
import Controls from "./Controls";
import LyricsView from "./LyricsView";
import MediaSessionController from "./MediaSessionController";
import { usePlayerContext } from "../context/PlayerContext";
import { ChevronDown } from "lucide-react";
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
        setShowPlaylist
    } = usePlayerContext();

    // Visual state
    const [showVisualizer, setShowVisualizer] = useState(true);
    const [activePanel, setActivePanel] = useState<"controls" | "lyrics">("controls");
    const [isMobileLayout, setIsMobileLayout] = useState(false);

    // We lift these UI states here as they are specific to the full player view
    // showPlaylist is now in context
    const [showVolumePopup, setShowVolumePopup] = useState(false);
    const [showSettingsPopup, setShowSettingsPopup] = useState(false);
    const accentColor = currentSong?.colors?.[0] || "#a855f7";

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

    // Close handling with animation
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowFullPlayer(false);
            setIsClosing(false); // Reset for next time
        }, 300);
    };

    if (!showFullPlayer) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col ${isClosing ? 'animate-slide-down' : 'animate-slide-up'} bg-transparent`}>
            {/* Background placeholder to prevent black flash before FluidBackground loads */}
            <div className="absolute inset-0 bg-[#3c1450] -z-10 transition-colors duration-500" style={{ backgroundColor: accentColor }}></div>

            <style>{`
                @keyframes slideInUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideOutDown {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(100%); opacity: 0; }
                }
                .animate-slide-up {
                    animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-slide-down {
                     animation: slideOutDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {/* Close Button */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors text-white"
                >
                    <ChevronDown size={24} />
                </button>
            </div>

            <FluidBackground
                key={isMobileLayout ? "mobile" : "desktop"}
                colors={currentSong?.colors && currentSong.colors.length > 0 ? currentSong.colors : undefined}
                coverUrl={currentSong?.coverUrl}
                isPlaying={playState === PlayState.PLAYING}
                isMobileLayout={isMobileLayout}
            />

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
                            accentColor={accentColor}
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

        </div>
    );
};

export default FullPlayer;
