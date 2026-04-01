import { useState, useEffect, useCallback } from 'react';
import {
    getAllPlaylists,
    savePlaylist,
    deletePlaylist,
    getDirectoryHandle,
    resolveFileUrl,
    PlaylistInfo,
} from '../services/db';

export const useCustomPlaylists = () => {
    const [customPlaylists, setCustomPlaylists] = useState<PlaylistInfo[]>([]);

    const hydrateLocalPlaylists = useCallback(async (playlists: PlaylistInfo[]): Promise<PlaylistInfo[]> => {
        const hydrated: PlaylistInfo[] = [];

        for (const pl of playlists) {
            if (pl.type !== 'local' || !pl.directoryHandleId) {
                hydrated.push(pl);
                continue;
            }

            // Retrieve stored directory handle
            const dirHandle = await getDirectoryHandle(pl.directoryHandleId);
            if (!dirHandle) {
                // Handle was lost — still show playlist but songs won't be playable
                hydrated.push(pl);
                continue;
            }

            // Request permission (this may prompt the user)
            try {
                const perm = await (dirHandle as any).requestPermission({ mode: 'read' });
                if (perm !== 'granted') {
                    hydrated.push(pl);
                    continue;
                }
            } catch {
                hydrated.push(pl);
                continue;
            }

            // Reconstruct blob URLs for songs that have relativePath
            const resolvedSongs = await Promise.all(
                pl.songs.map(async (song) => {
                    if (!song.relativePath) return song;
                    const url = await resolveFileUrl(dirHandle, song.relativePath);
                    return { ...song, fileUrl: url || '' };
                }),
            );

            hydrated.push({ ...pl, songs: resolvedSongs });
        }

        return hydrated;
    }, []);

    const refreshPlaylists = useCallback(async () => {
        const raw = await getAllPlaylists();
        const hydrated = await hydrateLocalPlaylists(raw);
        setCustomPlaylists(hydrated);
    }, [hydrateLocalPlaylists]);

    useEffect(() => {
        refreshPlaylists();
    }, [refreshPlaylists]);

    const addPlaylist = async (playlist: PlaylistInfo) => {
        await savePlaylist(playlist);
        await refreshPlaylists();
    };

    const removePlaylist = async (id: string) => {
        await deletePlaylist(id);
        await refreshPlaylists();
    };

    return {
        customPlaylists,
        addPlaylist,
        removePlaylist,
        refreshPlaylists,
    };
};
