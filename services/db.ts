import { get, set, keys, del } from 'idb-keyval';
import { Song } from '../types';

export type PlaylistType = 'netease' | 'local';

export interface PlaylistInfo {
    id: string;
    name: string;
    type: PlaylistType;
    coverUrl?: string;
    songs: Song[];
    createdAt: number;
    directoryHandleId?: string; // Links to stored FileSystemDirectoryHandle
}

const PLAYLISTS_KEY_PREFIX = 'playlist_';
const DIR_HANDLE_KEY_PREFIX = 'dirhandle_';
const LYRICS_CACHE_KEY_PREFIX = 'lyrics_';

// ---- Directory Handle persistence ----

export const saveDirectoryHandle = async (id: string, handle: FileSystemDirectoryHandle) => {
    await set(`${DIR_HANDLE_KEY_PREFIX}${id}`, handle);
};

export const getDirectoryHandle = async (id: string): Promise<FileSystemDirectoryHandle | null> => {
    return (await get<FileSystemDirectoryHandle>(`${DIR_HANDLE_KEY_PREFIX}${id}`)) || null;
};

// ---- Playlist CRUD ----

export const savePlaylist = async (playlist: PlaylistInfo) => {
    // Strip any transient blob URLs before persisting — they won't survive a reload
    const cleaned: PlaylistInfo = {
        ...playlist,
        songs: playlist.songs.map(s => ({
            ...s,
            // Keep fileUrl only for netease songs (actual http URLs).
            // For local songs the URL is a transient blob: URL — we'll reconstruct it on load.
            fileUrl: s.relativePath ? '' : s.fileUrl,
        })),
    };
    await set(`${PLAYLISTS_KEY_PREFIX}${playlist.id}`, cleaned);
};

export const getAllPlaylists = async (): Promise<PlaylistInfo[]> => {
    const allKeys = await keys();
    const playlistKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(PLAYLISTS_KEY_PREFIX));

    const playlists: PlaylistInfo[] = [];
    for (const key of playlistKeys) {
        const pl = await get<PlaylistInfo>(key as string);
        if (pl) playlists.push(pl);
    }

    return playlists.sort((a, b) => b.createdAt - a.createdAt);
};

export const deletePlaylist = async (id: string) => {
    await del(`${PLAYLISTS_KEY_PREFIX}${id}`);
};

// ---- Lyrics Cache ----

export const saveLyricsToCache = async (
    songId: string,
    lyrics: { lrc: string; yrc?: string; tLrc?: string; metadata?: string[]; coverUrl?: string },
) => {
    await set(`${LYRICS_CACHE_KEY_PREFIX}${songId}`, lyrics);
};

export const getLyricsFromCache = async (
    songId: string,
): Promise<{ lrc: string; yrc?: string; tLrc?: string; metadata?: string[]; coverUrl?: string } | null> => {
    return (await get(`${LYRICS_CACHE_KEY_PREFIX}${songId}`)) || null;
};

// ---- Queue Persistence ----

export const saveCurrentQueue = async (queue: Song[]) => {
    // Strip blob URLs — they are session-only
    const cleaned = queue.map(s => ({
        ...s,
        fileUrl: s.relativePath ? '' : s.fileUrl,
    }));
    await set('aura-saved-queue', cleaned);
};

export const getSavedQueue = async (): Promise<Song[]> => {
    return (await get<Song[]>('aura-saved-queue')) || [];
};

// ---- File System Access helpers ----

/**
 * Resolve a Song's audio file from its directoryHandle + relativePath.
 * Returns a fresh blob: URL, or null if the file cannot be accessed.
 */
export const resolveFileUrl = async (
    directoryHandle: FileSystemDirectoryHandle,
    relativePath: string,
): Promise<string | null> => {
    try {
        const parts = relativePath.split('/');
        let current: FileSystemDirectoryHandle = directoryHandle;
        for (let i = 0; i < parts.length - 1; i++) {
            current = await current.getDirectoryHandle(parts[i]);
        }
        const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch {
        return null;
    }
};

/**
 * Read a file from a directory handle by relative path. Returns a File or null.
 */
export const getFileFromHandle = async (
    directoryHandle: FileSystemDirectoryHandle,
    relativePath: string,
): Promise<File | null> => {
    try {
        const parts = relativePath.split('/');
        let current: FileSystemDirectoryHandle = directoryHandle;
        for (let i = 0; i < parts.length - 1; i++) {
            current = await current.getDirectoryHandle(parts[i]);
        }
        const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
        return await fileHandle.getFile();
    } catch {
        return null;
    }
};
