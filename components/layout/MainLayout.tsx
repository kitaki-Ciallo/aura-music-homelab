import React, { useState, useRef } from 'react';
import Sidebar from '../Sidebar';
import PlayerBar from '../PlayerBar';
import KeyboardShortcuts from '../KeyboardShortcuts';
import PlaylistPanel from '../PlaylistPanel';
import { usePlayerContext } from '../../context/PlayerContext';
import { ChevronDown } from 'lucide-react';
import { useLocation, useOutlet } from 'react-router-dom';
import { useTransition, animated } from '@react-spring/web';
import ImportModal from '../ImportModal';

const AnimatedOutlet = () => {
    const location = useLocation();
    const element = useOutlet();

    const transitions = useTransition(location.pathname, {
        from: { opacity: 0, y: 30 },
        enter: { opacity: 1, y: 0 },
        leave: { opacity: 0, y: -10 },
        config: { tension: 260, friction: 28 },
    });

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {transitions((style, pathname) => (
                <animated.div
                    style={{
                        ...style,
                        position: pathname === location.pathname ? 'relative' : 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        transform: style.y.to(y => `translate3d(0, ${y}px, 0)`),
                    } as any}
                >
                    {/* Only render content for the active route to prevent overlapping ghost text */}
                    {pathname === location.pathname ? element : null}
                </animated.div>
            ))}
        </div>
    );
};

const MainLayout: React.FC = () => {
    const [isImportOpen, setIsImportOpen] = useState(false);
    const {
        showPlaylist,
        setShowPlaylist,
        showFullPlayer,
        theme,
        queue,
        currentSong,
        playIndex,
        importFromUrl,
        removeSongs,
        customPlaylists
    } = usePlayerContext();
    const accentColor = currentSong?.colors?.[0] || "#a855f7";

    const drawerTransitions = useTransition(showPlaylist, {
        from: { opacity: 0, x: 100, backdropOpacity: 0 },
        enter: { opacity: 1, x: 0, backdropOpacity: 1 },
        leave: { opacity: 0, x: 100, backdropOpacity: 0 },
        config: { tension: 280, friction: 32 },
    });

    return (
        <div className={`flex flex-col h-screen text-white overflow-hidden font-sans relative z-10 transition-opacity duration-[400ms] ${showFullPlayer && theme === 'fluid' ? 'opacity-0' : 'opacity-100'}`}>
            <KeyboardShortcuts />
            <div className="flex-1 flex min-h-0">
                <Sidebar playlists={customPlaylists} onOpenImport={() => setIsImportOpen(true)} />
                <div className="flex-1 overflow-y-auto relative no-scrollbar">
                    <AnimatedOutlet />
                </div>
            </div>

            {/* Playlist Sidebar Overlay (Global) */}
            {drawerTransitions((styles, item) => item && (
                <animated.div
                    className="absolute inset-x-0 top-0 bottom-24 z-[60] flex justify-end isolate"
                    style={{ pointerEvents: item ? 'auto' : 'none' } as any}
                >
                    {/* Backdrop */}
                    <animated.div
                        className={`absolute inset-0 -z-10 ${theme === 'fluid' ? 'bg-white/10 backdrop-blur-sm' : 'bg-black/40'}`}
                        style={{ opacity: styles.backdropOpacity }}
                        onClick={() => setShowPlaylist(false)}
                    />

                    <animated.div
                        className={`w-full max-w-sm h-full border-l shadow-2xl flex flex-col relative ${theme === 'fluid' ? 'bg-white/20 backdrop-blur-3xl saturate-150 border-white/20' : 'bg-zinc-900 border-white/5'}`}
                        style={{
                            opacity: styles.opacity,
                            transform: styles.x.to(x => `translateX(${x}%)`),
                            boxShadow: theme === 'fluid' ? '-10px 0 50px rgba(0,0,0,0.15), inset 1px 0 0 rgba(255,255,255,0.15)' : 'none'
                        } as any}
                    >
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
                    </animated.div>
                </animated.div>
            ))}

            <div className="h-24 bg-white/10 backdrop-blur-xl border-t border-white/10 z-[70] shrink-0">
                <PlayerBar />
            </div>

            <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
        </div>
    );
};

export default MainLayout;
