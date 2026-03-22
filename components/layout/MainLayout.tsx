
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import PlayerBar from '../PlayerBar';
import KeyboardShortcuts from '../KeyboardShortcuts';
import PlaylistPanel from '../PlaylistPanel';
import { usePlayerContext } from '../../context/PlayerContext';
import { ChevronDown } from 'lucide-react';
import { useLocation, useOutlet } from 'react-router-dom';
import { useTransition, animated } from '@react-spring/web';

const AnimatedOutlet = () => {
    const location = useLocation();
    const element = useOutlet();
    // Re-enable scrollbars for non-homepage routes if requested, but existing design uses custom scrollbars or hidden ones.
    // User requested: "Global immersive scroll on homepage, traditional web scroll on artists/albums".
    // We'll handle the class in MainLayout based on location.

    const transitions = useTransition(location, {
        keys: location.pathname,
        from: { opacity: 0, transform: 'translate3d(0, 20px, 0)' },
        enter: { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        leave: { opacity: 0, position: 'absolute', transform: 'translate3d(0, -20px, 0)' },
        config: { tension: 280, friction: 30 },
        initial: null,
    });

    return transitions((style, item) => (
        <animated.div style={{ ...style, width: '100%', height: '100%' }}>
            {/* Pass the element that corresponds to this location key match */}
            {/* Note: useOutlet returns the element for the current route. 
             When transitioning out, we want to retain the OLD element.
             react-spring handles this by keeping 'item' (which is location) available.
             BUT 'element' from useOutlet changes immediately.
             
             To fix this, we need to clone the element or specific router setup. 
             Given the complexity, a simple Fade-In on mount for pages is safer for now 
             to avoid "Route not found" or empty outlet issues during transition.
          */}
            {/* Reverting to simple fade-in per page or just using the current element if key matches */}
            {item.pathname === location.pathname ? element : null}
        </animated.div>
    ));
};

// Better approach for simple usage:
// Just wrap Outlet in a div that animates on key change?
// Let's try a simpler approach invoked inside MainLayout directly.

const MainLayout: React.FC = () => {
    const [playlists, setPlaylists] = useState<string[]>([]);
    const {
        showPlaylist,
        setShowPlaylist,
        showFullPlayer,
        theme,
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
        <div className={`flex flex-col h-screen text-white overflow-hidden font-sans relative z-10 transition-opacity duration-[400ms] ${showFullPlayer && theme === 'fluid' ? 'opacity-0' : 'opacity-100'}`}>
            <KeyboardShortcuts />
            <div className="flex-1 flex min-h-0">
                <Sidebar playlists={playlists} />

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto relative no-scrollbar">
                    <AnimatedOutlet />
                </div>
            </div>

            {/* Playlist Sidebar Overlay (Global) */}
            {showPlaylist && (
                <div className={`absolute inset-x-0 top-0 bottom-24 z-[60] flex justify-end animate-in fade-in duration-300 ${theme === 'fluid' ? 'bg-white/10 backdrop-blur-sm' : 'bg-black/40'}`}>
                    <div className={`w-full max-w-sm h-full border-l shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-300 ${theme === 'fluid' ? 'bg-white/10 backdrop-blur-3xl border-white/10' : 'bg-black/95 border-white/5'}`}>
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
            <div className="h-24 bg-white/10 backdrop-blur-xl border-t border-white/10 z-[70] shrink-0">
                <PlayerBar />
            </div>
        </div>
    );
};

export default MainLayout;
