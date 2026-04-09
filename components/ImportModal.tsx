import React, { useState } from 'react';
import { X, Link as LinkIcon, FolderOutput, Loader2, Trash2 } from 'lucide-react';
import { usePlayerContext } from '../context/PlayerContext';
import { fetchNeteasePlaylist } from '../services/lyricsService';
import { parseNeteaseLink } from '../services/utils';
import { Song } from '../types';
import { saveDirectoryHandle } from '../services/db';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// ---- File System Access helpers (local to this component) ----

interface CollectedFiles {
    audio: { relativePath: string; handle: FileSystemFileHandle }[];
    meta: { relativePath: string; handle: FileSystemFileHandle }[];
}

/**
 * Recursively walk a directory handle and collect audio + metadata files,
 * grouped by their immediate parent folder name (used as playlist name).
 */
async function collectFiles(
    dirHandle: FileSystemDirectoryHandle,
    prefix: string = '',
): Promise<Map<string, CollectedFiles>> {
    const result = new Map<string, CollectedFiles>();

    const ensureGroup = (name: string) => {
        if (!result.has(name)) result.set(name, { audio: [], meta: [] });
        return result.get(name)!;
    };

    for await (const entry of (dirHandle as any).values()) {
        const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.kind === 'directory') {
            // Recurse into sub-directory
            const subResults = await collectFiles(entry as FileSystemDirectoryHandle, entryPath);
            for (const [subName, subGroup] of subResults) {
                const existing = ensureGroup(subName);
                existing.audio.push(...subGroup.audio);
                existing.meta.push(...subGroup.meta);
            }
        } else if (entry.kind === 'file') {
            const fileName: string = entry.name;
            // Determine playlist name from the immediate parent folder
            const playlistName = prefix.split('/').pop() || dirHandle.name || 'Local Playlist';

            if (fileName.match(/\.(mp3|flac|wav|aac|ogg|m4a|opus|wma)$/i)) {
                ensureGroup(playlistName).audio.push({ relativePath: entryPath, handle: entry as FileSystemFileHandle });
            } else if (fileName.match(/\.(json|lrc)$/i)) {
                ensureGroup(playlistName).meta.push({ relativePath: entryPath, handle: entry as FileSystemFileHandle });
            }
        }
    }

    return result;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
    const { customPlaylists, addPlaylist, removePlaylist, theme } = usePlayerContext();
    const [activeTab, setActiveTab] = useState<'netease' | 'local'>('local');
    const [neteaseUrl, setNeteaseUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState('');

    if (!isOpen) return null;

    const handleImportNetease = async () => {
        if (!neteaseUrl.trim()) return;
        setLoading(true);
        setError('');

        try {
            const parsed = parseNeteaseLink(neteaseUrl);
            if (!parsed) {
                setError('Invalid Netease Cloud Music link');
                return;
            }

            const tracks = await fetchNeteasePlaylist(parsed.id);
            if (tracks.length === 0) {
                setError('No songs found in this playlist or it is private.');
                return;
            }

            const songs: Song[] = tracks.map(t => ({
                id: t.id,
                title: t.title,
                artist: t.artist,
                album: t.album,
                coverUrl: t.coverUrl,
                duration: t.duration ? t.duration / 1000 : 0,
                isNetease: true,
                neteaseId: t.id,
                fileUrl: `https://music.163.com/song/media/outer/url?id=${t.id}.mp3`,
                needsLyricsMatch: true
            }));

            await addPlaylist({
                id: `netease-${parsed.id}`,
                name: `Netease Playlist ${parsed.id}`,
                type: 'netease',
                songs,
                createdAt: Date.now()
            });
            setNeteaseUrl('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const handleImportLocal = async () => {
        // Check for File System Access API support
        if (!('showDirectoryPicker' in window)) {
            setError('Your browser does not support the File System Access API. Please use Chrome or Edge.');
            return;
        }

        setLoading(true);
        setError('');
        setProgress('Selecting folder...');

        try {
            const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
            const dirHandleId = `local-${Date.now()}`;

            // Persist the directory handle for future sessions
            await saveDirectoryHandle(dirHandleId, dirHandle);

            setProgress('Scanning files...');
            const playlistsMap = await collectFiles(dirHandle);

            let totalProcessed = 0;
            const totalAudio = Array.from(playlistsMap.values()).reduce((s, g) => s + g.audio.length, 0);

            for (const [pName, group] of playlistsMap.entries()) {
                if (group.audio.length === 0) continue;

                const songs: Song[] = [];

                for (let i = 0; i < group.audio.length; i++) {
                    const { relativePath, handle: fileHandle } = group.audio[i];
                    const audioFile = await fileHandle.getFile();
                    const baseName = audioFile.name.replace(/\.[^/.]+$/, "");
                    const nameParts = baseName.split("-");
                    let artist = "Unknown Artist";
                    let songTitle = baseName;
                    if (nameParts.length > 1) {
                        artist = nameParts[0].trim();
                        songTitle = nameParts[1].trim();
                    }

                    totalProcessed++;
                    setProgress(`Processing ${totalProcessed}/${totalAudio}: ${songTitle}`);

                    let finalLyrics: any[] | undefined = undefined;

                    // Look for metadata file (same basename, .json or .lrc)
                    const matchMeta = group.meta.find(m => {
                        const metaBase = m.relativePath.split('/').pop()?.replace(/\.[^/.]+$/, "") || '';
                        return metaBase === baseName;
                    });

                    if (matchMeta) {
                        try {
                            const metaFile = await matchMeta.handle.getFile();
                            const text = await metaFile.text();
                            if (matchMeta.relativePath.endsWith('.json')) {
                                const parsed = JSON.parse(text);
                                const { mergeLyricsWithMetadata } = await import('../services/lyricsService');
                                finalLyrics = mergeLyricsWithMetadata(parsed);
                            } else if (matchMeta.relativePath.endsWith('.lrc')) {
                                const { parseLyrics } = await import('../services/lyrics');
                                finalLyrics = parseLyrics(text);
                            }
                        } catch (err) { }
                    }

                    let coverUrl: string | undefined = undefined;
                    let colors: string[] | undefined = undefined;
                    let parsedAlbum = pName;

                    try {
                        const { parseAudioMetadata, extractColors } = await import('../services/utils');
                        const metadata = await parseAudioMetadata(audioFile);

                        if (metadata.title) songTitle = metadata.title;
                        if (metadata.artist) artist = metadata.artist;
                        if (metadata.album) parsedAlbum = metadata.album;

                        if (metadata.pictureBlob) {
                            // Convert embedded cover to data URL for persistence (blob URLs expire on refresh)
                            const dataUrl = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(metadata.pictureBlob!);
                            });
                            coverUrl = dataUrl;
                            try {
                                colors = await extractColors(coverUrl);
                            } catch (e) { }
                        }

                        // Fetch missing metadata from Netease API
                        if (!coverUrl || artist === "Unknown Artist") {
                            try {
                                const { searchNetEase } = await import("../services/lyricsService");
                                const searchQuery = artist !== "Unknown Artist" ? `${songTitle} ${artist}` : songTitle;
                                const searchResults = await searchNetEase(searchQuery, { limit: 1 });

                                if (searchResults && searchResults.length > 0) {
                                    const cloudMatch = searchResults[0];

                                    if (artist === "Unknown Artist" && cloudMatch.artist) {
                                        artist = cloudMatch.artist;
                                    }
                                    if (parsedAlbum === pName && cloudMatch.album) {
                                        parsedAlbum = cloudMatch.album;
                                    }
                                    if (cloudMatch.coverUrl) {
                                        // Prefer cloud cover URL (it's a persistent http URL)
                                        coverUrl = cloudMatch.coverUrl;
                                        try {
                                            colors = await extractColors(coverUrl);
                                        } catch (e) { }
                                    }
                                }
                            } catch (cloudErr) {
                                console.warn("Failed to fetch missing metadata from cloud", cloudErr);
                            }
                        }
                    } catch (err) { }

                    // Extract duration using a temporary Audio element
                    const tempUrl = URL.createObjectURL(audioFile);
                    let duration = 0;
                    try {
                        duration = await new Promise<number>((resolve) => {
                            const audio = document.createElement('audio');
                            audio.preload = 'metadata';
                            const cleanup = () => {
                                audio.onloadedmetadata = null;
                                audio.onerror = null;
                                audio.src = '';
                            };
                            audio.onloadedmetadata = () => {
                                resolve(audio.duration);
                                cleanup();
                            };
                            audio.onerror = () => {
                                resolve(0);
                                cleanup();
                            };
                            audio.src = tempUrl;
                        });
                    } catch (e) {
                        // ignore
                    }

                    songs.push({
                        id: `local-${dirHandleId}-${pName}-${i}`,
                        title: songTitle,
                        artist: artist,
                        album: parsedAlbum,
                        duration,
                        relativePath, // Store relative path instead of blob
                        fileUrl: tempUrl, // Transient session URL
                        coverUrl,
                        colors,
                        lyrics: finalLyrics,
                        needsLyricsMatch: finalLyrics === undefined || finalLyrics.length === 0
                    });
                }

                await addPlaylist({
                    id: `${dirHandleId}-${pName}`,
                    name: pName,
                    type: 'local',
                    songs,
                    directoryHandleId: dirHandleId,
                    createdAt: Date.now()
                });
            }

            setProgress('');
            onClose();
        } catch (e: any) {
            if (e.name === 'AbortError') {
                // User cancelled the directory picker
                setProgress('');
            } else {
                setError(e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const isFluid = theme === 'fluid';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className={`border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ${isFluid
                ? "bg-white/80 backdrop-blur-3xl border-white/50"
                : "bg-zinc-900 border-white/10"
                }`}
                style={isFluid ? { boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.4)' } : {}}>

                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isFluid ? "border-black/10 bg-white/40" : "border-white/10 bg-white/5"
                    }`}>
                    <h2 className={`text-xl font-bold ${isFluid ? "text-gray-900" : "text-white"}`}>Manage Playlists</h2>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isFluid ? "text-gray-500 hover:text-gray-900 hover:bg-black/5" : "text-white/50 hover:text-white hover:bg-white/10"
                        }`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable content with immersive scrollbar */}
                <div className="p-6 flex-1 flex flex-col gap-8 overflow-y-auto"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: isFluid ? 'rgba(0,0,0,0.2) transparent' : 'rgba(255,255,255,0.2) transparent',
                    }}>

                    {/* Import Section */}
                    <div>
                        <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isFluid ? "text-gray-500" : "text-white/60"
                            }`}>Import New Playlist</h3>

                        <div className={`flex gap-2 mb-4 p-1 rounded-lg ${isFluid ? "bg-black/5" : "bg-black/20"}`}>
                            <button
                                onClick={() => setActiveTab('local')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'local'
                                    ? (isFluid ? 'bg-white text-gray-900 shadow-sm' : 'bg-white/10 text-white')
                                    : (isFluid ? 'text-gray-500 hover:text-gray-800' : 'text-white/40 hover:text-white/70')
                                    }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <FolderOutput size={16} /> Local Folder
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('netease')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'netease'
                                    ? (isFluid ? 'bg-white text-gray-900 shadow-sm' : 'bg-white/10 text-white')
                                    : (isFluid ? 'text-gray-500 hover:text-gray-800' : 'text-white/40 hover:text-white/70')
                                    }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <LinkIcon size={16} /> Web Link
                                </span>
                            </button>
                        </div>

                        {error && <div className={`mb-4 text-sm ${isFluid ? "text-red-500" : "text-red-400"}`}>{error}</div>}

                        {activeTab === 'netease' ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Paste Netease Playlist Link..."
                                    value={neteaseUrl}
                                    onChange={(e) => setNeteaseUrl(e.target.value)}
                                    className={`w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors ${isFluid
                                        ? "bg-white/50 border border-black/10 text-gray-900 placeholder-gray-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400/30"
                                        : "bg-black/40 border border-white/10 text-white placeholder-white/30 focus:border-pink-500/50"
                                        }`}
                                />
                                <button
                                    onClick={handleImportNetease}
                                    disabled={loading || !neteaseUrl}
                                    className={`w-full font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${isFluid
                                        ? "bg-pink-500 hover:bg-pink-600 disabled:bg-gray-200 disabled:text-gray-400 text-white shadow-sm"
                                        : "bg-pink-600 hover:bg-pink-500 disabled:bg-white/10 disabled:text-white/30 text-white"
                                        }`}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Import Netease Playlist'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleImportLocal}
                                disabled={loading}
                                className={`w-full border border-dashed hover:border-pink-400 font-medium py-8 rounded-xl transition-all flex flex-col items-center justify-center gap-3 group ${isFluid
                                    ? "border-black/20 hover:bg-pink-50/50 text-gray-500 hover:text-gray-800"
                                    : "border-white/20 hover:bg-pink-500/10 text-white/70 hover:text-white"
                                    }`}
                            >
                                {loading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 size={32} className="animate-spin text-pink-500" />
                                        {progress && <span className={`text-xs ${isFluid ? "text-gray-500" : "text-white/50"}`}>{progress}</span>}
                                    </div>
                                ) : (
                                    <>
                                        <div className={`p-4 rounded-full transition-colors ${isFluid ? "bg-black/5 group-hover:bg-pink-100/50" : "bg-white/5 group-hover:bg-pink-500/20"
                                            }`}>
                                            <FolderOutput size={32} className={`group-hover:text-pink-400 ${isFluid ? "text-gray-400" : "text-white/60"}`} />
                                        </div>
                                        <span>Click to Open Local Folder</span>
                                        <span className={`text-xs ${isFluid ? "text-gray-400" : "text-white/30"}`}>Uses File System Access API — files stay on disk</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Manage Section */}
                    {customPlaylists.length > 0 && (
                        <div>
                            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 border-t pt-6 ${isFluid ? "text-gray-500 border-black/5" : "text-white/60 border-white/10"
                                }`}>Your Playlists</h3>
                            <div className="space-y-2">
                                {customPlaylists.map(pl => (
                                    <div key={pl.id} className={`flex items-center justify-between border p-3 rounded-lg group transition-colors ${isFluid
                                        ? "bg-white/40 hover:bg-white/80 border-black/5"
                                        : "bg-black/20 hover:bg-white/5 border-white/5"
                                        }`}>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-sm font-medium truncate ${isFluid ? "text-gray-900" : "text-white"}`}>{pl.name}</span>
                                            <span className={`text-xs ${isFluid ? "text-gray-500" : "text-white/40"}`}>{pl.songs.length} songs • {pl.type === 'netease' ? 'Web' : 'Local'}</span>
                                        </div>
                                        <button
                                            onClick={() => removePlaylist(pl.id)}
                                            className={`p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${isFluid
                                                ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                : "text-white/30 hover:text-red-400 hover:bg-red-400/10"
                                                }`}
                                            title="Delete Playlist"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ImportModal;
