
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import PlayerBar from '../PlayerBar';
// import { usePlayer } from '../../hooks/usePlayer'; // We will fix this import later

const MainLayout: React.FC = () => {
    const [playlists, setPlaylists] = useState<string[]>([]);

    // Fetch playlists on mount
    useEffect(() => {
        fetch('/api/playlists')
            .then(res => res.json())
            .then(data => setPlaylists(data))
            .catch(err => console.error("Failed to load playlists", err));
    }, []);

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
            <Sidebar playlists={playlists} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto relative bg-gradient-to-b from-[#1e1e1e] to-black">
                    <Outlet />
                </div>

                {/* Player Bar Area */}
                <div className="h-24 bg-[#181818] border-t border-white/10">
                    <PlayerBar />
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
