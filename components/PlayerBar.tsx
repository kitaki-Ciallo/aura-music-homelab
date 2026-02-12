
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Maximize2 } from 'lucide-react';
import { usePlayerContext } from '../context/PlayerContext';
import { PlayState, PlayMode } from '../types';
import { NavLink } from 'react-router-dom';

const PlayerBar: React.FC = () => {
    const {
        currentSong,
        playState,
        togglePlay,
        playNext,
        playPrev,
        currentTime,
        duration,
        handleSeek,
        volume,
        setVolume,
        playMode,
        showFullPlayer,
        setShowFullPlayer,
        queue,
        showPlaylist,
        setShowPlaylist
    } = usePlayerContext();

    const formatTime = (time: number) => {
        if (!time || isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!currentSong && queue.length === 0) return null;

    return (
        <div className="h-full flex items-center justify-between px-4 w-full text-white">
            {/* Song Info */}
            <div className="flex items-center gap-4 w-[30%] min-w-0">
                <div
                    className="w-14 h-14 rounded-md overflow-hidden bg-white/10 relative group cursor-pointer shadow-sm border border-white/10"
                    onClick={() => setShowFullPlayer(true)}
                >
                    {currentSong?.coverUrl ? (
                        <img src={currentSong.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5 text-xs text-white/40">
                            No Cover
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 size={20} className="text-white drop-shadow-md" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate text-sm">
                        {currentSong?.title || "No Song Playing"}
                    </div>
                    <div className="text-xs text-white/60 truncate">
                        {currentSong?.artist || "Unknown Artist"}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-2 w-[40%]">
                <div className="flex items-center gap-6">
                    {/* Play Mode Toggle */}
                    <button
                        onClick={usePlayerContext().toggleMode}
                        className={`text-white/70 hover:text-white transition-colors ${playMode !== PlayMode.LOOP_ALL ? 'text-purple-400 opacity-100' : ''}`}
                        title={playMode === PlayMode.LOOP_ONE ? "Loop One" : playMode === PlayMode.SHUFFLE ? "Shuffle" : "Loop All"}
                    >
                        {playMode === PlayMode.LOOP_ONE ? (
                            <Repeat size={18} className="text-purple-400" />
                        ) : playMode === PlayMode.SHUFFLE ? (
                            <Shuffle size={18} className="text-purple-400" />
                        ) : (
                            <Repeat size={18} />
                        )}
                        {playMode === PlayMode.LOOP_ONE && (
                            <span className="absolute text-[8px] font-bold -mt-2 ml-2 text-purple-400">1</span>
                        )}
                    </button>

                    <button onClick={playPrev} className="text-white/70 hover:text-white transition-colors">
                        <SkipBack size={24} fill="currentColor" className="scale-90" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                    >
                        {playState === PlayState.PLAYING ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={playNext} className="text-white/70 hover:text-white transition-colors">
                        <SkipForward size={24} fill="currentColor" className="scale-90" />
                    </button>

                    {/* Playlist Button */}
                    <button
                        onClick={() => {
                            // Don't open full player, just toggle playlist visibility
                            // Assuming there is a sidebar or overlay mechanism for playlist? 
                            // If showPlaylist only works inside FullPlayer, then we have a logic issue.
                            // But usually usage implies a sidebar. Let's see how FullPlayer consumes it.
                            setShowPlaylist(!showPlaylist);
                        }}
                        className={`text-white/70 hover:text-white transition-colors ${showPlaylist ? 'text-purple-400' : ''}`}
                        title="Playlist"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full max-w-md">
                    <span className="text-xs text-white/50 w-10 text-right font-medium">{formatTime(currentTime)}</span>
                    <div
                        className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative group"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const p = (e.clientX - rect.left) / rect.width;
                            handleSeek(p * duration, true);
                        }}
                    >
                        <div
                            className="absolute h-full bg-white/50 rounded-full group-hover:bg-white transition-colors"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs text-white/50 w-10 font-medium">{formatTime(duration)}</span>
                </div>
            </div>

            {/* Volume & Extras (Right Section) */}
            <div className="flex items-center justify-end gap-3 w-[30%]">
                <div className="flex items-center gap-2 group">
                    <button onClick={() => setVolume(volume === 0 ? 1 : 0)}>
                        <Volume2 size={20} className="text-white/60 hover:text-white" />
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100 transition-all"
                    />
                </div>
            </div>
        </div>
    );
};

export default PlayerBar;
