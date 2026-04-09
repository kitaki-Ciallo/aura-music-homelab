
import React, { useMemo } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import { Song, PlayState } from '../types';
import { Play, Pause } from 'lucide-react';

const Artists: React.FC = () => {
    const { queue, library, playState, currentSong, replaceAll, togglePlay } = usePlayerContext();

    const artists = useMemo(() => {
        const map = new Map<string, Song[]>();
        library.forEach(song => {
            const artist = song.artist || "Unknown Artist";
            if (!map.has(artist)) {
                map.set(artist, []);
            }
            map.get(artist)?.push(song);
        });
        // Sort by song count descending
        return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    }, [library]);

    // State for drill-down view
    const [selectedArtist, setSelectedArtist] = React.useState<string | null>(null);

    const displayedSongs = useMemo(() => {
        if (!selectedArtist) return [];
        return library.filter(s => (s.artist || "Unknown Artist") === selectedArtist);
    }, [selectedArtist, library]);

    const handleArtistClick = (artist: string) => {
        setSelectedArtist(artist);
    };

    const handleBack = () => {
        setSelectedArtist(null);
    };

    const handlePlayAll = () => {
        if (displayedSongs.length > 0) {
            replaceAll(displayedSongs);
        }
    };

    const handleSongClick = (song: Song, index: number) => {
        if (currentSong?.id === song.id) {
            togglePlay();
        } else {
            replaceAll(displayedSongs, index);
        }
    };

    const getArtistCover = (songs: Song[]) => {
        return songs.find(s => s.coverUrl)?.coverUrl;
    };

    // Detail View
    if (selectedArtist) {
        const coverUrl = getArtistCover(displayedSongs);
        const formatTime = (time?: number) => {
            if (!time || isNaN(time)) return "--:--";
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds.toString().padStart(2, "0")}`;
        };

        return (
            <div className="p-8 pb-32 text-white animate-fade-in">
                <button
                    onClick={handleBack}
                    className="mb-6 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium flex items-center gap-2"
                >
                    ← Back to Artists
                </button>

                <div className="flex flex-col md:flex-row gap-8 mb-8 items-start">
                    <div className="w-48 h-48 md:w-64 md:h-64 rounded-xl overflow-hidden shadow-2xl bg-white/10 flex-shrink-0">
                        {coverUrl ? (
                            <img src={coverUrl} alt={selectedArtist} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-white/20">
                                {selectedArtist.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col justify-end h-full py-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-pink-500 mb-2">Artist</h2>
                        <h1 className="text-4xl md:text-6xl font-bold mb-4">{selectedArtist}</h1>
                        <p className="text-white/60 font-medium mb-6">{displayedSongs.length} Songs</p>

                        <button
                            onClick={handlePlayAll}
                            className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105 w-max"
                        >
                            <Play fill="currentColor" size={20} />
                            Play Artist
                        </button>
                    </div>
                </div>

                {/* Song List */}
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 border-b border-white/10 text-xs font-semibold text-white/50 uppercase tracking-wider">
                    <div className="w-8 text-center">#</div>
                    <div>Title</div>
                    <div>Album</div>
                    <div className="w-12 text-center">Time</div>
                </div>

                <div className="mt-2">
                    {displayedSongs.map((song, i) => {
                        const isCurrent = currentSong?.id === song.id;
                        const isPlaying = isCurrent && playState === PlayState.PLAYING;

                        return (
                            <div
                                key={song.id}
                                onClick={() => handleSongClick(song, i)}
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
                                    <div className={`text-sm font-medium truncate ${isCurrent ? 'text-pink-500' : 'text-white'}`}>{song.title}</div>
                                </div>
                                <div className="text-sm text-white/50 truncate">
                                    {song.album || "Unknown Album"}
                                </div>
                                <div className="flex items-center justify-center text-sm text-white/40 font-tabular-nums">
                                    {formatTime(song.duration)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Grid View (Default)
    return (
        <div className="p-8 text-white pb-32">
            <h1 className="text-3xl font-bold mb-8">Artists</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {artists.map(([artist, songs]) => {
                    const firstSong = songs[0];
                    const coverUrl = songs.find(s => s.coverUrl)?.coverUrl;

                    return (
                        <div
                            key={artist}
                            className="group relative bg-white/5 hover:bg-white/10 rounded-2xl p-4 transition-all hover:scale-[1.02] cursor-pointer"
                            onClick={() => handleArtistClick(artist)}
                        >
                            <div className="aspect-square rounded-full overflow-hidden bg-white/10 mb-4 relative shadow-lg mx-auto w-full max-w-[160px]">
                                {coverUrl ? (
                                    <img src={coverUrl} alt={artist} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/20 select-none">
                                        {artist.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                {/* Hover Play Button - optional, maybe just redundant with click? 
                                    Let's keep it simple: click card open detail. 
                                    Or maybe a small play button in corner to play immediately?
                                    User said "click artist card... cover moves to left... show songs".
                                    So main click action is navigate.
                                */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold truncate text-lg mb-1">{artist}</h3>
                                <p className="text-sm text-white/60 font-medium">{songs.length} Songs</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Artists;
