
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Music, Disc, Mic2, ListMusic, PlusCircle, Search } from 'lucide-react';

interface SidebarProps {
    playlists: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ playlists }) => {
    return (
        <div className="w-64 h-full bg-black/10 backdrop-blur-md border-r border-white/5 flex flex-col pt-6">
            <div className="px-6 mb-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent">
                    Aura Music
                </h1>
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
