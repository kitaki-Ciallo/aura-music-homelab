import React, { useState, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { usePlayerContext } from '../context/PlayerContext';
import SmartImage from '../components/SmartImage';

const Search: React.FC = () => {
    const [query, setQuery] = useState('');
    const { library, replaceAll } = usePlayerContext();

    // Filter songs based on query
    const results = library ? library.filter(song =>
        song.title.toLowerCase().includes(query.toLowerCase()) ||
        song.artist.toLowerCase().includes(query.toLowerCase()) ||
        (song.album && song.album.toLowerCase().includes(query.toLowerCase()))
    ) : [];

    return (
        <div className="p-8 pb-32 min-h-full text-white animate-fade-in">
            <h1 className="text-4xl font-bold mb-8">Search</h1>

            <div className="relative mb-8 max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-white/40" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 sm:text-sm transition-colors"
                    placeholder="Search for songs, artists, or albums..."
                    autoFocus
                />
            </div>

            <div className="space-y-2">
                {query && results.length === 0 ? (
                    <div className="text-white/50 text-center py-10">No results found for "{query}"</div>
                ) : (
                    results.map((song, index) => {
                        return (
                            <div
                                key={song.id}
                                onClick={() => replaceAll(results, index)}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-lg overflow-hidden relative">
                                    <SmartImage
                                        src={song.coverUrl}
                                        alt={song.title}
                                        containerClassName="w-full h-full"
                                        imgClassName="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate text-white">{song.title}</div>
                                    <div className="text-sm text-white/60 truncate">{song.artist} • {song.album || 'Unknown Album'}</div>
                                </div>
                                <div className="text-sm text-white/40 font-mono">
                                    {Math.floor(song.duration / 60)}:{Math.floor(song.duration % 60).toString().padStart(2, '0')}
                                </div>
                            </div>
                        );
                    })
                )}
                {!query && library && library.length > 0 && (
                    <div className="text-white/30 text-sm mt-4">Type to search across {library.length} songs</div>
                )}
            </div>
        </div>
    );
};

export default Search;
