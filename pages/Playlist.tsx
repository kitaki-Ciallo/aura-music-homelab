
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, Clock, ArrowLeft } from 'lucide-react';
import { usePlayerContext } from '../context/PlayerContext';
import { Song, PlayState } from '../types';
import { formatTime } from '../services/utils';
import { useNavigate } from 'react-router-dom';

const Playlist: React.FC = () => {
    const { name } = useParams<{ name: string }>();
    const [songs, setSongs] = useState<Song[]>([]);
    const { playIndex, currentSong, playState, togglePlay, replaceAll, queue } = usePlayerContext();
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!name) return;
        setLoading(true);
        fetch(`/api/songs?playlist=${encodeURIComponent(name)}`)
            .then(res => res.json())
            .then(data => {
                setSongs(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch songs", err);
                setLoading(false);
            });
    }, [name]);

    const handlePlay = (song: Song, index: number) => {
        // If the current song is the one clicked, just toggle play
        if (currentSong?.id === song.id) {
            togglePlay();
            return;
        }

        // Otherwise, replace the entire queue with the current list and play this song
        replaceAll(songs, index);
    };

    const renderCover = () => {
        const coverSongs = songs.filter(s => s.coverUrl).slice(0, 4);

        if (coverSongs.length === 0) {
            return (
                <div className="w-40 h-40 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg shadow-xl flex items-center justify-center text-white">
                    <span className="text-4xl font-bold uppercase">{name?.charAt(0)}</span>
                </div>
            );
        }

        if (coverSongs.length < 4) {
            return (
                <img src={coverSongs[0].coverUrl} alt={name} className="w-40 h-40 rounded-lg shadow-xl object-cover" />
            );
        }

        // 2x2 Grid
        return (
            <div className="w-40 h-40 rounded-lg shadow-xl overflow-hidden grid grid-cols-2">
                {coverSongs.map((song, i) => (
                    <img key={i} src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                ))}
            </div>
        );
    };

    if (loading) return <div className="p-8 text-white/50">Loading playlist...</div>;

    return (
        <div className="p-8 pb-32">
            <div className="flex items-end gap-6 mb-8">
                {renderCover()}
                <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-pink-500 mb-1">Playlist</h4>
                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">{name}</h1>
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
                            <div className="w-8 flex items-center justify-center text-sm text-white/40 group-hover:text-white">
                                {isCurrent ? (
                                    isPlaying ? <span className="animate-pulse text-pink-500">♫</span> : <span className="text-pink-500">{i + 1}</span>
                                ) : (
                                    <span className="group-hover:hidden">{i + 1}</span>
                                )}
                                <Play size={12} className={`hidden group-hover:block ${isCurrent ? 'hidden' : ''}`} fill="currentColor" />
                                {isCurrent && !isPlaying && <Play size={12} className="hidden group-hover:block" fill="currentColor" />}
                                {isPlaying && <Pause size={12} className="hidden group-hover:block" fill="currentColor" />}
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

export default Playlist;
