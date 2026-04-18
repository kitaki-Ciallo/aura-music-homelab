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
                {/* Wrap FluidBackground in a blurred container - using filter instead of backdrop-filter
                    to avoid re-computing blur on every frame when foreground content animates */}
                <div
                    className={`absolute inset-0 transition-[filter] duration-500 ${showFullPlayer && theme === 'fluid' ? '' : 'blur-[20px]'}`}
                    style={{ transform: 'scale(1.1)' }} // Slightly oversized to hide blur edge artifacts
                >
                    <FluidBackground
                        colors={displayColors}
                        coverUrl={currentSong?.coverUrl}
                        isPlaying={theme === 'fluid'}
                        isMobileLayout={false}
                    />
                </div>
                {/* Dark overlay for text readability */}
                <div className={`absolute inset-0 bg-black/30 transition-opacity duration-500 ${showFullPlayer && theme === 'fluid' ? 'opacity-0' : 'opacity-100'}`} />
            </div>
        </div>
    );
};

export default GlobalBackground;
