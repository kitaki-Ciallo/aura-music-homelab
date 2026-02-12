import React from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import FluidBackground from './FluidBackground';
import { PlayState } from '../types';

const GlobalBackground: React.FC = () => {
    const { currentSong, playState } = usePlayerContext();

    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <FluidBackground
                colors={currentSong?.colors && currentSong.colors.length > 0 ? currentSong.colors : undefined}
                coverUrl={currentSong?.coverUrl}
                isPlaying={true} // Always render background, even if paused
                isMobileLayout={false} // Use desktop/default rendering
            />
            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[20px]" />
        </div>
    );
};

export default GlobalBackground;
