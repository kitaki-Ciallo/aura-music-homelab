
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Music, Disc, Mic2, ListMusic, PlusCircle, Search } from 'lucide-react';

interface SidebarProps {
    playlists: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ playlists }) => {
    return (
        <div className="w-64 h-full bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col pt-6">
            <div className="px-6 mb-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
                    Aura Music
                </h1>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 space-y-6">
                <div>
                    <h2 className="px-2 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                        Library
                    </h2>
                    <div className="space-y-1">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Music size={18} />
                            All Songs
                        </NavLink>
                        <NavLink
                            to="/artists"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Mic2 size={18} />
                            Artists
                        </NavLink>
                        <NavLink
                            to="/albums"
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
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
                        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
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
                                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
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

            {/* Search Input Placeholder */}
            <div className="p-4 mt-auto border-t border-white/10">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/80 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all"
                    />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
