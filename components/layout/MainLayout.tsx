
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import PlayerBar from '../PlayerBar';
import KeyboardShortcuts from '../KeyboardShortcuts';
import PlaylistPanel from '../PlaylistPanel';
import { usePlayerContext } from '../../context/PlayerContext';
import { ChevronDown } from 'lucide-react';

const MainLayout: React.FC = () => {
    const [playlists, setPlaylists] = useState<string[]>([]);
    const {
        showPlaylist,
        setShowPlaylist,
        queue,
        currentSong,
        playIndex,
        importFromUrl,
        removeSongs
    } = usePlayerContext();
    const accentColor = currentSong?.colors?.[0] || "#a855f7";

    // Fetch playlists on mount
    useEffect(() => {
        fetch('/api/playlists')
            .then(res => res.json())
            .then(data => setPlaylists(data))
            .catch(err => console.error("Failed to load playlists", err));
    }, []);

    return (
        <div className="flex flex-col h-screen text-white overflow-hidden font-sans relative z-10">
            <KeyboardShortcuts />
            <div className="flex-1 flex min-h-0">
                <Sidebar playlists={playlists} />

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto relative">
                    <Outlet />
                </div>
            </div>

            {/* Playlist Sidebar Overlay (Global) */}
            {showPlaylist && (
                <div className="absolute inset-x-0 top-0 bottom-24 z-[60] bg-black/20 backdrop-blur-sm flex justify-end animate-in fade-in duration-300">
                    <div className="w-full max-w-sm h-full bg-black/60 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-300">
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
                                accentColor={accentColor}
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

            {/* Player Bar Area - Spans full width at bottom */}
            <div className="h-24 bg-black/20 backdrop-blur-xl border-t border-white/10 z-[70] shrink-0">
                <PlayerBar />
            </div>
        </div>
    );
};

export default MainLayout;
