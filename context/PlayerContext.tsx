
import React, { createContext, useContext, ReactNode } from 'react';
import { usePlaylist } from '../hooks/usePlaylist';
import { usePlayer } from '../hooks/usePlayer';
import { Song, PlayState, PlayMode } from '../types';

interface PlayerContextType {
    // Playlist State
    queue: Song[];
    library: Song[];

    // Player State
    currentSong: Song | null;
    playState: PlayState;
    currentTime: number;
    duration: number;
    playMode: PlayMode;
    toggleMode: () => void;
    volume: number;
    setVolume: (v: number) => void;
    speed: number;
    setSpeed: (s: number) => void;
    preservesPitch: boolean;
    togglePreservesPitch: () => void;
    matchStatus: "idle" | "matching" | "success" | "failed";
    isBuffering: boolean;

    // Actions
    togglePlay: () => void;
    playNext: () => void;
    playPrev: () => void;
    handleSeek: (time: number, playImmediately?: boolean, defer?: boolean) => void;
    playIndex: (index: number) => void;
    addSongAndPlay: (song: Song) => void;
    replaceAll: (songs: Song[], startIndex?: number) => void;
    importFromUrl: (url: string) => Promise<boolean>;
    removeSongs: (ids: string[]) => void;

    // UI Helpers
    audioRef: React.RefObject<HTMLAudioElement | null>;
    showFullPlayer: boolean;
    setShowFullPlayer: (show: boolean) => void;
    showPlaylist: boolean;
    setShowPlaylist: (show: boolean) => void;

    // Theme State
    theme: 'fluid' | 'dark' | 'light';
    setTheme: (theme: 'fluid' | 'dark' | 'light') => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const playlist = usePlaylist();
    const player = usePlayer({
        queue: playlist.queue,
        originalQueue: playlist.originalQueue,
        updateSongInQueue: playlist.updateSongInQueue,
        setQueue: playlist.setQueue,
        setOriginalQueue: playlist.setOriginalQueue,
    });

    const [volume, setVolume] = React.useState<number>(() => {
        try {
            const saved = localStorage.getItem('aura-volume');
            return saved !== null ? parseFloat(saved) : 1;
        } catch { return 1; }
    });

    React.useEffect(() => {
        localStorage.setItem('aura-volume', volume.toString());
    }, [volume]);
    const [showFullPlayer, setShowFullPlayer] = React.useState(false);
    const [showPlaylist, setShowPlaylist] = React.useState(false);

    // Theme state
    const [theme, setThemeState] = React.useState<'fluid' | 'dark' | 'light'>(() => {
        return (localStorage.getItem('aura-theme') as 'fluid' | 'dark' | 'light') || 'fluid';
    });

    const setTheme = React.useCallback((newTheme: 'fluid' | 'dark' | 'light') => {
        setThemeState(newTheme);
        localStorage.setItem('aura-theme', newTheme);

        document.body.classList.remove('theme-light', 'theme-dark', 'theme-fluid');
        document.body.classList.add(`theme-${newTheme}`);
    }, []);

    React.useEffect(() => {
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-fluid');
        document.body.classList.add(`theme-${theme}`);
    }, [theme]);

    // Sync volume to audio ref
    React.useEffect(() => {
        if (player.audioRef.current) {
            player.audioRef.current.volume = volume;
        }
    }, [volume, player.audioRef]);

    // Import wrapper
    const importFromUrl = async (url: string) => {
        const result = await playlist.importFromUrl(url);
        if (result.success && result.songs.length > 0) {
            player.handlePlaylistAddition(result.songs, playlist.queue.length === 0);
            return true;
        }
        return false;
    };

    const replaceAll = (songs: Song[], startIndex = 0) => {
        playlist.replaceAll(songs);
        // We need to wait for state update or force player to reset index
        // Since React state updates are async, we might need a better way to sync this.
        // For now, let's rely on usePlayer reacting to queue change
        // But usePlayer needs to know which index to start
        setTimeout(() => {
            player.playIndex(startIndex);
        }, 0);
    };

    // Library State
    const [library, setLibrary] = React.useState<Song[]>([]);
    const isInitializedRef = React.useRef(false);

    // Fetch library on mount
    React.useEffect(() => {
        fetch('/api/songs')
            .then(res => res.json())
            .then(data => {
                setLibrary(data);
                if (!isInitializedRef.current && playlist.queue.length === 0 && data.length > 0) {
                    console.log("[PlayerContext] Hydrating empty queue with full library mapping");
                    playlist.replaceAll(data);
                    // Do NOT auto-play `player.playIndex(0)` anymore!
                    isInitializedRef.current = true;
                }
            })
            .catch(err => {
                console.error("Failed to fetch library", err);
            });
    }, []);

    const value: PlayerContextType = {
        queue: playlist.queue,
        library, // Expose library
        currentSong: player.currentSong,
        playState: player.playState,
        currentTime: player.currentTime,
        duration: player.duration,
        playMode: player.playMode,
        toggleMode: player.toggleMode,
        volume,
        setVolume,
        speed: player.speed,
        setSpeed: player.setSpeed,
        preservesPitch: player.preservesPitch,
        togglePreservesPitch: player.togglePreservesPitch,
        matchStatus: player.matchStatus,
        isBuffering: player.isBuffering,
        togglePlay: player.togglePlay,
        playNext: player.playNext,
        playPrev: player.playPrev,
        handleSeek: player.handleSeek,
        playIndex: player.playIndex,
        addSongAndPlay: player.addSongAndPlay,
        replaceAll,
        importFromUrl,
        removeSongs: playlist.removeSongs,
        audioRef: player.audioRef,
        showFullPlayer,
        setShowFullPlayer,
        showPlaylist,
        setShowPlaylist,
        theme,
        setTheme
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
            {/* Audio Element is managed here centrally */}
            <audio
                ref={player.audioRef}
                src={player.resolvedAudioSrc ?? player.currentSong?.fileUrl}
                onTimeUpdate={player.handleTimeUpdate}
                onLoadedMetadata={player.handleLoadedMetadata}
                onEnded={player.handleAudioEnded}
                crossOrigin="anonymous"
            />
        </PlayerContext.Provider>
    );
};

export const usePlayerContext = () => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error("usePlayerContext must be used within a PlayerProvider");
    }
    return context;
};
