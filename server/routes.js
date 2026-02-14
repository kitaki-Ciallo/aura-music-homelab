
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFile } from 'music-metadata';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MUSIC_DIR = process.env.MUSIC_DIR || path.join(__dirname, '../music');

// Helper to get all files recursively
const getFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(getFiles(file));
        } else {
            /* Is a file */
            results.push(file);
        }
    });
    return results;
}

// GET /api/playlists - List all subdirectories in MUSIC_DIR as playlists
router.get('/playlists', (req, res) => {
    try {
        if (!fs.existsSync(MUSIC_DIR)) {
            return res.json(['All Songs']);
        }
        const dirents = fs.readdirSync(MUSIC_DIR, { withFileTypes: true });
        const playlists = dirents
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

        // Add "All Songs" as a virtual playlist
        res.json(['All Songs', ...playlists]);
    } catch (error) {
        console.error('Error reading playlists:', error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// GET /api/songs - List all songs (or filter by playlist)
router.get('/songs', async (req, res) => {
    try {
        const { playlist } = req.query;
        let targetDir = MUSIC_DIR;

        if (playlist && playlist !== 'All Songs') {
            targetDir = path.join(MUSIC_DIR, playlist);
        }

        if (!fs.existsSync(targetDir)) {
            return res.json([]);
        }

        const allFiles = getFiles(targetDir);
        const supportedExtensions = ['.mp3', '.flac', '.wav', '.m4a', '.ogg'];

        const songFiles = allFiles.filter(file =>
            supportedExtensions.includes(path.extname(file).toLowerCase())
        );

        // Limit to 500 songs for now to prevent timeout on large libraries without pagination
        // We should implement pagination later
        const limitedSongs = songFiles.slice(0, 500);

        const songs = await Promise.all(limitedSongs.map(async (file) => {
            const relativePath = path.relative(MUSIC_DIR, file);
            // Ensure URL uses forward slashes
            const urlPath = relativePath.split(path.sep).join('/');

            // Basic info from file path
            let title = path.basename(file, path.extname(file));
            let artist = 'Unknown Artist';
            let album = 'Unknown Album';
            let coverUrl = null;
            let duration = 0;

            try {
                const metadata = await parseFile(file);
                if (metadata.common.title) title = metadata.common.title;
                if (metadata.common.artist) artist = metadata.common.artist;
                if (metadata.common.album) album = metadata.common.album;
                if (metadata.format.duration) duration = metadata.format.duration;

                // Check for sidecar JSON for overrides (Artist, Title, Cover, etc.)
                const jsonPath = file.replace(path.extname(file), '.json');
                if (fs.existsSync(jsonPath)) {
                    try {
                        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
                        const jsonData = JSON.parse(jsonContent);

                        if (jsonData.title) title = jsonData.title;
                        if (jsonData.artist) artist = jsonData.artist;
                        if (jsonData.album) album = jsonData.album;
                        // We will check coverUrl later
                    } catch (e) {
                        console.warn(`[Metadata] Failed to parse sidecar JSON for ${path.basename(file)}`);
                    }
                }

                // Helper to detect garbage/mojibake (simple heuristic)
                const isGarbage = (str) => {
                    if (!str) return true;
                    // Check for replacement characters
                    if (str.includes('')) return true;
                    // Check for high density of special characters often seen in encoding errors
                    // e.g. "$o$?$7", "%D%#", etc.
                    if (/^[\x20-\x7E]*$/.test(str)) {
                        // ASCII only, check for noise
                        const noise = (str.match(/[%$#@!&^*?]/g) || []).length;
                        if (noise > str.length * 0.4 && str.length > 5) return true;
                    }
                    return false;
                };

                // WAV Fallback: parsing filename if metadata is missing, generic, or garbage
                // Assuming format: "Artist - Title.ext" or just "Title.ext"
                // For WAV files, we trust filename more if tags look suspicious
                const isWav = path.extname(file).toLowerCase() === '.wav';
                const hasTags = title !== path.basename(file, path.extname(file)) && title !== 'Unknown Title';

                if (!hasTags || artist === 'Unknown Artist' || isGarbage(title) || isGarbage(artist)) {
                    // Try parsing filename
                    const basename = path.basename(file, path.extname(file));
                    const parts = basename.split(' - ');
                    if (parts.length >= 2) {
                        artist = parts[0].trim();
                        title = parts.slice(1).join(' - ').trim();
                        // console.log(`[Metadata] Fallback/Repair for ${path.basename(file)} -> ${artist} - ${title}`);
                    } else if (!hasTags || isGarbage(title)) {
                        // If we have no separator but title is bad, use basename
                        title = basename;
                    }
                }

                // Debug log
                if (duration === 0) {
                    console.log(`[Metadata] No duration found for: ${path.basename(file)}`);
                }

                // Check for embedded cover if no external cover found
                // We do this here to avoid re-parsing the file later
                // Check for cover image in the same directory first (priority)
                const songDir = path.dirname(file);
                const potentialCovers = ['cover.jpg', 'folder.jpg', 'cover.png', 'folder.png', `${path.basename(file, path.extname(file))}.jpg`];
                let externalCoverFound = false;

                for (const coverName of potentialCovers) {
                    const checkPath = path.join(songDir, coverName);
                    if (fs.existsSync(checkPath)) {
                        const coverPath = path.relative(MUSIC_DIR, checkPath);
                        coverUrl = `/music/${coverPath.split(path.sep).join('/')}`;
                        externalCoverFound = true;
                        break;
                    }
                }

                // Check sidecar JSON for coverUrl if not found
                if (!externalCoverFound) {
                    const jsonPath = file.replace(path.extname(file), '.json');
                    if (fs.existsSync(jsonPath)) {
                        try {
                            const jsonContent = fs.readFileSync(jsonPath, 'utf8');
                            const jsonData = JSON.parse(jsonContent);
                            if (jsonData.coverUrl) {
                                coverUrl = jsonData.coverUrl;
                                externalCoverFound = true;
                            }
                        } catch (e) { }
                    }
                }

                if (!externalCoverFound && metadata.common.picture && metadata.common.picture.length > 0) {
                    coverUrl = `/api/cover?file=${encodeURIComponent(relativePath)}`;
                }

            } catch (err) {
                console.warn(`[Metadata] Error parsing ${path.basename(file)}:`, err.message);
            }

            return {
                id: title + artist, // Simple unique ID
                title,
                artist,
                album,
                duration,
                fileUrl: `/music/${urlPath}`,
                coverUrl,
            };


        }));

        res.json(songs);
    } catch (error) {
        console.error('Error fetching songs:', error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

// GET /api/cover - Serve embedded cover art
router.get('/cover', async (req, res) => {
    const { file } = req.query;
    if (!file) {
        return res.status(400).send('Missing file parameter');
    }

    const filePath = path.join(MUSIC_DIR, decodeURIComponent(file));
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    try {
        const metadata = await parseFile(filePath);
        const picture = metadata.common.picture && metadata.common.picture[0];

        if (picture) {
            res.setHeader('Content-Type', picture.format);
            res.send(picture.data);
        } else {
            res.status(404).send('No cover found');
        }
    } catch (error) {
        console.error('Error extracting cover:', error);
        res.status(500).send('Error extracting cover');
    }
});

// GET /api/lyrics - Get local lyrics (JSON first, then LRC)
router.get('/lyrics', (req, res) => {
    const { file } = req.query;
    if (!file) {
        return res.status(400).send('Missing file parameter');
    }

    const songPath = path.join(MUSIC_DIR, decodeURIComponent(file));
    const jsonPath = songPath.replace(path.extname(songPath), '.json');
    const lrcPath = songPath.replace(path.extname(songPath), '.lrc');

    if (fs.existsSync(jsonPath)) {
        res.setHeader('Content-Type', 'application/json');
        res.send(fs.readFileSync(jsonPath, 'utf8'));
    } else if (fs.existsSync(lrcPath)) {
        res.send(fs.readFileSync(lrcPath, 'utf8'));
    } else {
        res.status(404).send('No local lyrics found');
    }
});

// POST /api/lyrics - Save lyrics locally (JSON or LRC)
router.post('/lyrics', express.json(), (req, res) => {
    const { file, lyrics } = req.body;
    if (!file || !lyrics) {
        return res.status(400).send('Missing file or lyrics');
    }

    try {
        const songPath = path.join(MUSIC_DIR, file);
        // Security check: ensure we are writing inside MUSIC_DIR
        if (!songPath.startsWith(MUSIC_DIR)) {
            return res.status(403).send('Invalid path');
        }

        // Check if lyrics is an object (JSON) or string (LRC)
        // If string, check if it looks like JSON
        let isJson = false;
        let content = lyrics;

        if (typeof lyrics === 'object') {
            isJson = true;
            content = JSON.stringify(lyrics, null, 2);
        } else {
            try {
                // Try parsing as JSON to see if it is valid JSON string
                JSON.parse(lyrics);
                isJson = true;
            } catch (e) {
                isJson = false;
            }
        }

        const ext = isJson ? '.json' : '.lrc';
        const destPath = songPath.replace(path.extname(songPath), ext);

        fs.writeFileSync(destPath, content, 'utf8');
        console.log(`[Lyrics] Saved local lyrics (${ext}) for ${path.basename(file)}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving lyrics:', error);
        res.status(500).json({ error: 'Failed to save lyrics' });
    }
});

// Proxy for Netease Cloud Music API to avoid CORS and mixed content issues
router.get('/netease', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const targetUrl = decodeURIComponent(url);

        // Add headers to mimic browser/legitimate request
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://music.163.com/',
                'Origin': 'https://music.163.com'
            }
        });

        if (!response.ok) {
            throw new Error(`Upstream error: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error proxying to Netease:', error);
        res.status(500).json({ error: 'Failed to proxy request' });
    }
});

export default router;
