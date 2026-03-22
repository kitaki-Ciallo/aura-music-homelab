# Aura Music - Developer & Maintenance Context

This document provides essential context for AI assistants and developers maintaining this project. It is particularly useful for quickly understanding the architecture and restoring context after a session reset.

## System Architecture

**Frontend**: React 18, Vite, Tailwind CSS, React Router DOM.
- **UI Paradigm**: Glassmorphism, highly fluid animations, heavily styled to emulate modern media players (like Apple Music).
- **Core State**: Managed via `PlayerContext.tsx` (Queue, Playback State, Library).

**Backend**: Node.js + Express (`server/index.js`, `server/routes.js`).
- Port: `3002` (Frontend proxy routes `/api` here).
- **Music Serving**: Recursively scans the `MUSIC_DIR` (default: `../music`) and exposes metadata and files.

---

## Core Mechanisms & Known Gotchas

### 1. Music Library & Metadata (`server/routes.js`)
- **Folder Structure**: Subdirectories within `MUSIC_DIR` act as playlists.
- **Deduplication**: Because a single audio file might be placed in multiple playlist folders (e.g. "Favorites" and "Anime"), the `/api/songs` response **deduplicates** by a unique `id` (combination of `title + artist`). This prevents the `/search` page and the global "All Songs" view from displaying duplicate copies of the same track.
- **WAV & Metadata Fallbacks**: 
  - Some WAV files have garbled ID3 tags (e.g. Shift-JIS read as UTF-8) causing mojibake (like `$o$?$7...`). 
  - **Filename Fallback**: The server checks if the parsed title/artist looks like garbage (high special character density) or is missing. If so, it falls back to parsing the filename format: `Artist - Title.wav`.
  - **Sidecar JSON**: For completely busted metadata, the server checks for a sidecar `.json` file with the exact same name next to the audio file (e.g. `song.wav` and `song.json`). Content here overrides `title`, `artist`, `album`, `coverUrl`, `lrc`, `tLrc`, `yrc`.

### 2. Search System
- **Global Search (`/search`)**: Now correctly filters the local library. If the query is empty, it does **not** filter out anything, displaying the library prompt or full library natively.
- **Quick Search Modal (`SearchModal.tsx`)**: Accessed via hotkeys or icons. Has two tabs:
  1. `Queue`: Real-time filtering of the currently playing queue.
  2. `Cloud / Netease`: Searches Netease Cloud Music via proxy (`163api.qijieya.cn/cloudsearch`) to find streaming tracks, allowing users to add cloud tracks directly to their local queue seamlessly.

### 3. Visuals & Fluid Background (`FluidBackground.tsx`)
- **Color Extraction**: Web Worker logic extracts dominant colors from the album cover (`canvas`/`colorthief`).
- **Smooth Transitions**: During song changes, the background smoothly interpolates from the old color array to the new one pixel by pixel using Canvas gradients. 
  - *Gotcha Fixed*: The interpolation function `parseColor` specifically handles parsing **both** `#Hex` and `rgb(r,g,b)` string formats to prevent mid-transition color flashes (e.g., dropping to black because it couldn't parse the intermediate RGB string).

### 4. Lyrics & Translations (`LyricsView.tsx` & `lyricsService.ts`)
- Automatically searches Netease for lyrics matching `title + artist`.
- The system supports 3 layers of lyrics per song:
  - `lrc`: Original language lyrics.
  - `tLrc`: Translated language lyrics.
  - `yrc`: Word-by-word precise timing (Romejima/Karaoke sync).
- If Cloud lyrics match, they are merged locally to drive the UI.

## Recent Major Fixes to Remember:
1. Deduplication applied to `/api/songs` resolving duplicate search items.
2. `parseColor` implemented in `FluidBackground.tsx` to prevent RGB/Hex parsing errors that flashed black between songs.
3. Empty query rendering stabilized in `/search` route to prevent unrelated playlist songs jumping out confusingly.
4. Support for injecting a Sidecar JSON into `music/CloudMusic/xxx.json` to locally override stubborn metadata.
