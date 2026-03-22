
import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { Home, Music, Disc, Mic2, ListMusic, PlusCircle, Search } from 'lucide-react';
import { usePlayerContext } from '../context/PlayerContext';

interface SidebarProps {
    playlists: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ playlists }) => {
    const { theme, setTheme } = usePlayerContext();

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

    return (
        <div className="w-64 h-full bg-white/10 backdrop-blur-md border-r border-white/5 flex flex-col pt-6 transform-gpu isolate">
            <div
                className="px-6 mb-8 cursor-pointer select-none group"
                onClick={cycleTheme}
                title="Click to change theme"
            >
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent transition-transform group-active:scale-95 origin-left inline-block">
                    Aura Music
                </h1>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Theme: {theme}
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 space-y-6">
                <div>
                    <h2 className="px-2 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                        Library
                    </h2>
                    <div className="space-y-1">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Music size={18} />
                            All Songs
                        </NavLink>
                        <NavLink
                            to="/artists"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Mic2 size={18} />
                            Artists
                        </NavLink>
                        <NavLink
                            to="/albums"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Disc size={18} />
                            Albums
                        </NavLink>
                        <NavLink
                            to="/search"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Search size={18} />
                            Search
                        </NavLink>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                            Playlists
                        </h2>
                        <button className="text-white/40 hover:text-white transition-colors">
                            <PlusCircle size={14} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {playlists.map((playlist) => (
                            playlist !== 'All Songs' && (
                                <NavLink
                                    key={playlist}
                                    to={`/playlist/${encodeURIComponent(playlist)}`}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <ListMusic size={18} />
                                    {playlist}
                                </NavLink>
                            )
                        ))}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
