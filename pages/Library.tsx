
import React, { useEffect, useState } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import { usePlayerContext } from '../context/PlayerContext';
import { formatTime } from '../services/utils';
import { Song, PlayState } from '../types';

const Library: React.FC = () => {
    const { playIndex, currentSong, playState, togglePlay, replaceAll, library } = usePlayerContext();
    // Use library from context directly, no loading state needed in this component strictly speaking, 
    // or we can assume if library is empty it might be loading or empty.
    const songs = library;

    const handlePlay = (song: Song, index: number) => {
        // If the current song is the one clicked, just toggle play
        if (currentSong?.id === song.id) {
            togglePlay();
            return;
        }

        // Otherwise, replace the entire queue with the current list and play this song
        replaceAll(songs, index);
    };




    const coverArt = React.useMemo(() => {
        const withCovers = songs.filter(s => s.coverUrl);
        if (withCovers.length < 4) return withCovers.slice(0, 4); // Take what we have
        // Simple random selection
        const shuffled = [...withCovers].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 4);
    }, [songs]); // Recalculate only if library changes

    const renderCover = () => {
        if (coverArt.length === 0) {
            return (
                <div className="w-40 h-40 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-xl flex items-center justify-center text-white">
                    <span className="text-4xl font-bold">All</span>
                </div>
            );
        }

        if (coverArt.length < 4) {
            // If we have at least one but less than 4, just show the first one full size
            // Or maybe a grid with repeats? Let's stick to full size for < 4 for simplicity like Playlist
            return (
                <img src={coverArt[0].coverUrl} alt="All Songs" className="w-40 h-40 rounded-lg shadow-xl object-cover" />
            );
        }

        return (
            <div className="w-40 h-40 rounded-lg shadow-xl overflow-hidden grid grid-cols-2">
                {coverArt.map((song, i) => (
                    <img key={i} src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                ))}
            </div>
        );
    };

    return (
        <div className="p-8 pb-32">
            <div className="flex items-end gap-6 mb-8">
                {renderCover()}
                <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-pink-500 mb-1">Playlist</h4>
                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">All Songs</h1>
                    <p className="text-white/60 text-sm font-medium">{songs.length} songs</p>
                </div>
            </div>

            {/* Song List Header */}
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 border-b border-white/10 text-xs font-semibold text-white/50 uppercase tracking-wider sticky top-0 bg-transparent z-10 backdrop-blur-sm">
                <div className="w-8 text-center">#</div>
                <div>Title</div>
                <div>Album</div>
                <div className="w-12 text-center"><Clock size={16} /></div>
            </div>

            {/* Songs */}
            <div className="mt-2">
                {songs.map((song, i) => {
                    const isCurrent = currentSong?.id === song.id;
                    const isPlaying = isCurrent && playState === PlayState.PLAYING;

                    return (
                        <div
                            key={song.id}
                            onClick={() => handlePlay(song, i)}
                            className={`grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 rounded-md hover:bg-white/10 group cursor-pointer transition-colors ${isCurrent ? 'bg-white/10' : ''}`}
                        >
                            <div className="w-8 flex items-center justify-center text-sm text-white/40 group-hover:text-white relative">
                                {/* Always hide the number on hover to make room for controls */}
                                <span className={`group-hover:hidden ${isCurrent ? 'hidden' : 'block'}`}>
                                    {i + 1}
                                </span>

                                {/* Current song status (not hovered) */}
                                {isCurrent && (
                                    <span className="group-hover:hidden">
                                        {isPlaying ? <span className="animate-pulse text-pink-500">♫</span> : <span className="text-pink-500">{i + 1}</span>}
                                    </span>
                                )}

                                {/* Hover controls */}
                                <div className="hidden group-hover:flex items-center justify-center">
                                    {isPlaying ? (
                                        <Pause size={12} fill="currentColor" />
                                    ) : (
                                        <Play size={12} fill="currentColor" />
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 overflow-hidden">
                                {song.coverUrl && (
                                    <img src={song.coverUrl} alt="" className="w-10 h-10 rounded object-cover border border-white/10" />
                                )}
                                <div className="min-w-0">
                                    <div className={`text-sm font-medium truncate ${isCurrent ? 'text-pink-500' : 'text-white'}`}>{song.title}</div>
                                    <div className="text-xs text-white/60 truncate">{song.artist}</div>
                                </div>
                            </div>

                            <div className="flex items-center text-sm text-white/50 truncate">
                                {song.album || "Unknown Album"}
                            </div>

                            <div className="flex items-center justify-center text-sm text-white/40 font-tabular-nums">
                                {song.duration ? formatTime(song.duration) : "--:--"}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export default Library;
