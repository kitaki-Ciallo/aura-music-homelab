import React from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import FluidBackground from './FluidBackground';
import { PlayState } from '../types';

const GlobalBackground: React.FC = () => {
    const { currentSong, playState } = usePlayerContext();

    // Persistent color state to prevent flashing on song change
    // Initialize with current song colors or undefined (which falls back to defaults in FluidBackground)
    const [displayColors, setDisplayColors] = React.useState<string[] | undefined>(currentSong?.colors);

    // Update colors only when we have valid new ones
    React.useEffect(() => {
        if (currentSong?.colors && currentSong.colors.length > 0) {
            setDisplayColors(currentSong.colors);
        }
    }, [currentSong?.colors]);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none">
            <FluidBackground
                colors={displayColors}
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
