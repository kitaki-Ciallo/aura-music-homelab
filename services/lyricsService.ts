export const fetchViaProxy = async (url: string, options: RequestInit = {}): Promise<any> => {
  // For same-origin URLs (e.g. /neteaseapi/*), direct fetch is sufficient
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (directError) {
    // For external URLs, try allorigins proxy as fallback
    if (url.startsWith('http')) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Proxy: ${response.status}`);
        return await response.json();
      } catch { /* fall through */ }
    }
    console.error("Fetch failed for:", url);
    return undefined;
  }
};

import { getLyricsFromCache, saveLyricsToCache } from './db';

/**
 * Fetch lyrics from IndexedDB cache (no backend needed).
 */
export const fetchLocalLyrics = async (songId: string): Promise<
  { lrc: string; yrc?: string; tLrc?: string; metadata?: string[]; coverUrl?: string } | null
> => {
  try {
    return await getLyricsFromCache(songId);
  } catch (error) {
    return null;
  }
};

/**
 * Save lyrics to IndexedDB cache (no backend needed).
 */
export const saveLocalLyrics = async (songId: string, lyrics: string | object) => {
  try {
    if (typeof lyrics === 'object') {
      await saveLyricsToCache(songId, lyrics as any);
    } else {
      // Convert plain LRC string to the object format for consistent storage
      await saveLyricsToCache(songId, { lrc: lyrics, metadata: [] });
    }
  } catch (error) {
    console.error("Failed to save lyrics to cache:", error);
  }
};



// Public Netease API (same as original dingyi222666/aura-music)
const LYRIC_API_BASE = "https://zm.wwoyun.cn";
const METING_API = "https://api.qijieya.cn/meting/";
const NETEASE_SEARCH_API = "https://zm.wwoyun.cn/cloudsearch";
const NETEASE_API_BASE = "http://music.163.com/api";
const NETEASECLOUD_API_BASE = "https://zm.wwoyun.cn";

const METADATA_KEYWORDS = [
  "歌词贡献者",
  "翻译贡献者",
  "作词",
  "作曲",
  "编曲",
  "制作",
  "词曲",
  "词 / 曲",
  "lyricist",
  "composer",
  "arrange",
  "translation",
  "translator",
  "producer",
];

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const metadataKeywordRegex = new RegExp(
  `^(${METADATA_KEYWORDS.map(escapeRegex).join("|")})\\s*[:：]`,
  "iu",
);

const TIMESTAMP_REGEX = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;

interface NeteaseApiArtist {
  name?: string;
}

interface NeteaseApiAlbum {
  name?: string;
  picUrl?: string;
}

interface NeteaseApiSong {
  id: number;
  name?: string;
  ar?: NeteaseApiArtist[];
  al?: NeteaseApiAlbum;
  dt?: number;
}

interface NeteaseSearchResponse {
  result?: {
    songs?: NeteaseApiSong[];
  };
}

interface NeteasePlaylistResponse {
  songs?: NeteaseApiSong[];
}

interface NeteaseSongDetailResponse {
  code?: number;
  songs?: NeteaseApiSong[];
}

export interface NeteaseTrackInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl?: string;
  duration?: number;
  isNetease: true;
  neteaseId: string;
}

type SearchOptions = {
  limit?: number;
  offset?: number;
};

const formatArtists = (artists?: NeteaseApiArtist[]) =>
  (artists ?? [])
    .map((artist) => artist.name?.trim())
    .filter(Boolean)
    .join("/") || "";

const mapNeteaseSongToTrack = (song: NeteaseApiSong): NeteaseTrackInfo => ({
  id: song.id.toString(),
  title: song.name?.trim() ?? "",
  artist: formatArtists(song.ar),
  album: song.al?.name?.trim() ?? "",
  coverUrl: song.al?.picUrl?.replaceAll("http:", "https:"),
  duration: song.dt,
  isNetease: true,
  neteaseId: song.id.toString(),
});

const isMetadataTimestampLine = (line: string): boolean => {
  const trimmed = line.trim();
  const match = trimmed.match(TIMESTAMP_REGEX);
  if (!match) return false;
  const content = match[4].trim();
  return metadataKeywordRegex.test(content);
};

const parseTimestampMetadata = (line: string) => {
  const match = line.trim().match(TIMESTAMP_REGEX);
  return match ? match[4].trim() : line.trim();
};

const isMetadataJsonLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  try {
    const json = JSON.parse(trimmed);
    if (json.c && Array.isArray(json.c)) {
      const content = json.c.map((item: any) => item.tx || "").join("");
      return metadataKeywordRegex.test(content);
    }
  } catch {
    // ignore invalid json
  }
  return false;
};

const parseJsonMetadata = (line: string) => {
  try {
    const json = JSON.parse(line.trim());
    if (json.c && Array.isArray(json.c)) {
      return json.c
        .map((item: any) => item.tx || "")
        .join("")
        .trim();
    }
  } catch {
    // ignore
  }
  return line.trim();
};

const extractMetadataLines = (content: string) => {
  const metadataSet = new Set<string>();
  const bodyLines: string[] = [];

  content.split("\n").forEach((line) => {
    if (!line.trim()) return;
    if (isMetadataTimestampLine(line)) {
      metadataSet.add(parseTimestampMetadata(line));
    } else if (isMetadataJsonLine(line)) {
      metadataSet.add(parseJsonMetadata(line));
    } else {
      bodyLines.push(line);
    }
  });

  return {
    clean: bodyLines.join("\n").trim(),
    metadata: Array.from(metadataSet),
  };
};

export const getNeteaseAudioUrl = (id: string) => {
  return `${METING_API}?type=url&id=${id}`;
};

// Implements the search logic from the user provided code snippet
export const searchNetEase = async (
  keyword: string,
  options: SearchOptions = {},
): Promise<NeteaseTrackInfo[]> => {
  const { limit = 20, offset = 0 } = options;
  const searchApiUrl = `${NETEASE_SEARCH_API}?keywords=${encodeURIComponent(
    keyword,
  )}&limit=${limit}&offset=${offset}`;

  try {
    const parsedSearchApiResponse = (await fetchViaProxy(
      searchApiUrl,
    )) as NeteaseSearchResponse | undefined;

    if (!parsedSearchApiResponse) {
      throw new Error("Search API returned empty response");
    }

    const songs = parsedSearchApiResponse.result?.songs ?? [];

    if (songs.length === 0) {
      return [];
    }

    return songs.map(mapNeteaseSongToTrack);
  } catch (error) {
    console.warn("NetEase search error, trying meting fallback", error);
    try {
      const metingUrl = `${METING_API}?server=netease&type=search&id=${encodeURIComponent(keyword)}`;
      const metingResponse = await fetchViaProxy(metingUrl);
      if (Array.isArray(metingResponse)) {
        return metingResponse.slice(0, limit).map((song: any) => {
          const idMatch = song.url?.match(/id=(\d+)/);
          const id = idMatch ? idMatch[1] : "";
          return {
            id,
            title: song.name,
            artist: song.artist,
            album: "", // meting doesn't return album in search
            coverUrl: song.pic,
            isNetease: true as const,
            neteaseId: id,
          };
        }).filter(s => s.id);
      }
    } catch (fallbackError) {
      console.error("Meting fallback failed", fallbackError);
    }
    return [];
  }
};

export const fetchNeteasePlaylist = async (
  playlistId: string,
): Promise<NeteaseTrackInfo[]> => {
  try {
    // 使用網易雲音樂 API 獲取歌單所有歌曲
    // 由於接口限制，需要分頁獲取，每次獲取 50 首
    const allTracks: NeteaseTrackInfo[] = [];
    const limit = 50;
    let offset = 0;
    let shouldContinue = true;

    while (shouldContinue) {
      const url = `${NETEASECLOUD_API_BASE}/playlist/track/all?id=${playlistId}&limit=${limit}&offset=${offset}`;
      const data = (await fetchViaProxy(url)) as NeteasePlaylistResponse;

      if (!data) {
        throw new Error("API returned empty response");
      }

      const songs = data.songs ?? [];
      if (songs.length === 0) {
        break;
      }

      const tracks = songs.map(mapNeteaseSongToTrack);

      allTracks.push(...tracks);

      // Continue fetching if the current page was full
      if (songs.length < limit) {
        shouldContinue = false;
      } else {
        offset += limit;
      }
    }

    return allTracks;
  } catch (e) {
    console.warn("Playlist fetch error, trying meting fallback", e);
    try {
      const metingUrl = `${METING_API}?server=netease&type=playlist&id=${playlistId}`;
      const metingResponse = await fetchViaProxy(metingUrl);
      if (Array.isArray(metingResponse)) {
        return metingResponse.map((song: any) => {
          const idMatch = song.url?.match(/id=(\d+)/);
          const id = idMatch ? idMatch[1] : "";
          return {
            id,
            title: song.name,
            artist: song.artist,
            album: "",
            coverUrl: song.pic,
            isNetease: true as const,
            neteaseId: id,
          };
        }).filter(s => s.id);
      }
    } catch (fallbackError) {
      console.error("Meting fallback failed", fallbackError);
    }
    return [];
  }
};

export const fetchNeteaseSong = async (
  songId: string,
): Promise<NeteaseTrackInfo | null> => {
  try {
    const url = `${NETEASECLOUD_API_BASE}/song/detail?ids=${songId}`;
    const data = (await fetchViaProxy(
      url,
    )) as NeteaseSongDetailResponse;

    if (!data) {
      throw new Error("API returned empty response");
    }

    const track = data.songs?.[0];
    if (data.code === 200 && track) {
      return mapNeteaseSongToTrack(track);
    }
    return null;
  } catch (e) {
    console.warn("Song fetch error, trying meting fallback", e);
    try {
      const metingUrl = `${METING_API}?server=netease&type=song&id=${songId}`;
      const metingResponse = await fetchViaProxy(metingUrl);
      if (Array.isArray(metingResponse) && metingResponse.length > 0) {
        const song = metingResponse[0];
        const idMatch = song.url?.match(/id=(\d+)/);
        const id = idMatch ? idMatch[1] : songId;
        return {
          id,
          title: song.name,
          artist: song.artist,
          album: "",
          coverUrl: song.pic,
          isNetease: true,
          neteaseId: id,
        };
      }
    } catch (fallbackError) {
      console.error("Meting fallback failed", fallbackError);
    }
    return null;
  }
};

// Keeps the old search for lyric matching fallbacks
export const searchAndMatchLyrics = async (
  title: string,
  artist: string,
): Promise<{ lrc: string; yrc?: string; tLrc?: string; metadata: string[]; coverUrl?: string } | null> => {
  try {
    const searchQuery = artist && artist !== "Unknown Artist" ? `${title} ${artist}` : title;
    const songs = await searchNetEase(searchQuery, { limit: 5 });

    if (songs.length === 0) {
      console.warn("No songs found on Cloud");
      return null;
    }

    const songId = songs[0].id;
    console.log(`Found Song ID: ${songId}`);

    const lyricsResult = await fetchLyricsById(songId);
    if (lyricsResult) {
      return {
        ...lyricsResult,
        coverUrl: songs[0].coverUrl
      };
    }
    return null;
  } catch (error) {
    console.error("Cloud lyrics match failed:", error);
    return null;
  }
};

export const fetchLyricsById = async (
  songId: string,
): Promise<{ lrc: string; yrc?: string; tLrc?: string; metadata: string[]; coverUrl?: string } | null> => {
  try {
    // 使用網易雲音樂 API 獲取歌詞
    const lyricUrl = `${NETEASECLOUD_API_BASE}/lyric/new?id=${songId}`;
    const lyricData = await fetchViaProxy(lyricUrl);

    if (!lyricData) {
      throw new Error("API returned empty response");
    }

    const rawYrc = lyricData.yrc?.lyric;
    const rawLrc = lyricData.lrc?.lyric;
    const tLrc = lyricData.tlyric?.lyric;

    if (!rawYrc && !rawLrc) return null;

    const {
      clean: cleanLrc,
      metadata: lrcMetadata,
    } = rawLrc
        ? extractMetadataLines(rawLrc)
        : { clean: undefined, metadata: [] };

    const {
      clean: cleanYrc,
      metadata: yrcMetadata,
    } = rawYrc
        ? extractMetadataLines(rawYrc)
        : { clean: undefined, metadata: [] };

    // Extract metadata from translation if available
    let cleanTranslation: string | undefined;
    let translationMetadata: string[] = [];
    if (tLrc) {
      const result = extractMetadataLines(tLrc);
      cleanTranslation = result.clean;
      translationMetadata = result.metadata;
    }

    const metadataSet = Array.from(
      new Set([...lrcMetadata, ...yrcMetadata, ...translationMetadata]),
    );

    if (lyricData.transUser?.nickname) {
      metadataSet.unshift(`翻译贡献者: ${lyricData.transUser.nickname}`);
    }

    if (lyricData.lyricUser?.nickname) {
      metadataSet.unshift(`歌词贡献者: ${lyricData.lyricUser.nickname}`);
    }

    const baseLyrics = cleanLrc || cleanYrc || rawLrc || rawYrc;
    if (!baseLyrics) return null;

    const yrcForEnrichment = cleanYrc && cleanLrc ? cleanYrc : undefined;
    return {
      lrc: baseLyrics,
      yrc: yrcForEnrichment,
      tLrc: cleanTranslation,
      metadata: Array.from(metadataSet),
    };
  } catch (e) {
    console.warn("Lyric fetch error, trying meting fallback", e);
    try {
      // Meting API doesn't provide separate yrc/tLrc easily via simple type=lrc
      // But we can try to fetch them if we need to, or just return the basic lrc
      // Wait, Meting API might return translated lyrics mixed in if we just use type=lrc
      // Let's try to fetch the raw JSON from a different proxy if possible, or just use the mixed one
      const metingUrl = `${METING_API}?server=netease&type=lrc&id=${songId}`;
      const response = await fetch(metingUrl);
      if (response.ok) {
        const lrc = await response.text();
        if (lrc && !lrc.includes('"error"')) {
          // Check if the lrc contains translations in parentheses and try to separate them
          // This is a basic heuristic for Meting's mixed lyrics
          let cleanLrc = "";
          let cleanTLrc = "";

          const lines = lrc.split('\n');
          for (const line of lines) {
            // Match lines like: [00:05.44]君を見てるといつもハートとき~とき (每当看到你的时候~心砰砰直跳)
            const match = line.match(/^(\[\d{2}:\d{2}\.\d{2,3}\])(.*?) \((.*?)\)$/);
            if (match) {
              cleanLrc += `${match[1]}${match[2]}\n`;
              cleanTLrc += `${match[1]}${match[3]}\n`;
            } else {
              cleanLrc += `${line}\n`;
            }
          }

          const { clean, metadata } = extractMetadataLines(cleanLrc);
          const { clean: tClean } = extractMetadataLines(cleanTLrc);

          return {
            lrc: clean || cleanLrc,
            tLrc: tClean || undefined,
            metadata,
          };
        }
      }
    } catch (fallbackError) {
      console.error("Meting fallback failed", fallbackError);
    }
    return null;
  }
};

import { parseLyrics } from "./lyrics";
import { LyricLine } from "../types";

export const mergeLyricsWithMetadata = (
  result: { lrc: string; yrc?: string; tLrc?: string; metadata?: string[]; coverUrl?: string }
): LyricLine[] => {
  const parsed = parseLyrics(result.lrc, result.tLrc, {
    yrcContent: result.yrc,
  });
  const metadataCount = result.metadata?.length || 0;
  const metadataLines = (result.metadata || []).map((text, idx) => ({
    time: -0.1 * (metadataCount - idx),
    text,
    isMetadata: true,
  }));
  return [...metadataLines, ...parsed].sort((a, b) => a.time - b.time);
};
