import React from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import FluidBackground from './FluidBackground';
import { PlayState } from '../types';

const GlobalBackground: React.FC = () => {
    const { currentSong, playState, theme, showFullPlayer } = usePlayerContext();

    // Persistent color state to prevent flashing on song change
    const [displayColors, setDisplayColors] = React.useState<string[] | undefined>(currentSong?.colors);

    React.useEffect(() => {
        if (currentSong?.colors && currentSong.colors.length > 0) {
            setDisplayColors(currentSong.colors);
        }
    }, [currentSong?.colors]);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none bg-black transition-colors duration-1000">
            <div className={`absolute inset-0 transition-opacity duration-1000 ${theme === 'fluid' ? 'opacity-100' : 'opacity-0'}`}>
                <FluidBackground
                    colors={displayColors}
                    coverUrl={currentSong?.coverUrl}
                    isPlaying={theme === 'fluid'}
                    isMobileLayout={false}
                />
                {/* Overlay for text readability - hidden when FullPlayer is open so fluid bg shows cleanly */}
                <div className={`absolute inset-0 bg-black/30 backdrop-blur-[20px] transition-opacity duration-500 ${showFullPlayer && theme === 'fluid' ? 'opacity-0' : 'opacity-100'}`} />
            </div>
        </div>
    );
};

export default GlobalBackground;
