import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Song, PlayState, PlayMode } from "../types";
import { extractColors, shuffleArray } from "../services/utils";
import { parseLyrics } from "../services/lyrics";
import {
  fetchLyricsById,
  searchAndMatchLyrics,
  mergeLyricsWithMetadata,
  fetchLocalLyrics,
  saveLocalLyrics,
} from "../services/lyricsService";
import { audioResourceCache } from "../services/cache";

type MatchStatus = "idle" | "matching" | "success" | "failed";

interface UsePlayerParams {
  queue: Song[];
  originalQueue: Song[];
  updateSongInQueue: (id: string, updates: Partial<Song>) => void;
  setQueue: Dispatch<SetStateAction<Song[]>>;
  setOriginalQueue: Dispatch<SetStateAction<Song[]>>;
}

const MATCH_TIMEOUT_MS = 8000;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Lyrics request timed out"));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

export const usePlayer = ({
  queue,
  originalQueue,
  updateSongInQueue,
  setQueue,
  setOriginalQueue,
}: UsePlayerParams) => {
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('aura-current-index');
      console.log("[usePlayer] Initializing currentIndex from local storage:", saved);
      return saved ? parseInt(saved, 10) : -1;
    } catch { return -1; }
  });
  const [playState, setPlayState] = useState<PlayState>(PlayState.PAUSED);
  const [currentTime, setCurrentTime] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem('aura-current-time') || '0');
    } catch { return 0; }
  });
  const [duration, setDuration] = useState(0);
  const [playMode, setPlayMode] = useState<PlayMode>(() => {
    try {
      const saved = localStorage.getItem('aura-play-mode');
      return saved !== null ? (parseInt(saved, 10) as PlayMode) : PlayMode.LOOP_ALL;
    } catch { return PlayMode.LOOP_ALL; }
  });
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const audioRef = useRef<HTMLAudioElement>(null);
  const isSeekingRef = useRef(false);

  const pauseAndResetCurrentAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, []);

  const currentSong = queue[currentIndex] ?? null;
  const accentColor = currentSong?.colors?.[0] || "#a855f7";
  const queueHasLoadedRef = useRef(false);

  const reorderForShuffle = useCallback(() => {
    if (originalQueue.length === 0) return;
    const currentId = currentSong?.id;
    const pool = originalQueue.filter((song) => song.id !== currentId);
    const shuffled = shuffleArray([...pool]);
    if (currentId) {
      const current = originalQueue.find((song) => song.id === currentId);
      if (current) {
        setQueue([current, ...shuffled]);
        setCurrentIndex(0);
        return;
      }
    }
    setQueue(shuffled);
    setCurrentIndex(0);
  }, [currentSong, originalQueue, setQueue]);

  const toggleMode = useCallback(() => {
    let nextMode: PlayMode;
    if (playMode === PlayMode.LOOP_ALL) nextMode = PlayMode.LOOP_ONE;
    else if (playMode === PlayMode.LOOP_ONE) nextMode = PlayMode.SHUFFLE;
    else nextMode = PlayMode.LOOP_ALL;

    setPlayMode(nextMode);
    setMatchStatus("idle");

    if (nextMode === PlayMode.SHUFFLE) {
      reorderForShuffle();
    } else {
      setQueue(originalQueue);
      if (currentSong) {
        const idx = originalQueue.findIndex(
          (song) => song.id === currentSong.id,
        );
        setCurrentIndex(idx !== -1 ? idx : 0);
      } else {
        setCurrentIndex(originalQueue.length > 0 ? 0 : -1);
      }
    }
  }, [playMode, reorderForShuffle, originalQueue, currentSong, setQueue]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playState === PlayState.PLAYING) {
      audioRef.current.pause();
      setPlayState(PlayState.PAUSED);
    } else {
      const duration = audioRef.current.duration || 0;
      const isAtEnd =
        duration > 0 && audioRef.current.currentTime >= duration - 0.01;
      if (isAtEnd) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      audioRef.current.play().catch((err) => console.error("Play failed", err));
      setPlayState(PlayState.PLAYING);
    }
  }, [playState]);

  const play = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current
      .play()
      .catch((err) => console.error("Play failed", err));
    setPlayState(PlayState.PLAYING);
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setPlayState(PlayState.PAUSED);
  }, []);

  const handleSeek = useCallback(
    (
      time: number,
      playImmediately: boolean = false,
      defer: boolean = false,
    ) => {
      if (!audioRef.current) return;

      if (defer) {
        // Only update visual state during drag, don't actually seek
        isSeekingRef.current = true;
        setCurrentTime(time);
      } else {
        // Actually perform the seek
        audioRef.current.currentTime = time;
        setCurrentTime(time);
        isSeekingRef.current = false;
        if (playImmediately) {
          audioRef.current
            .play()
            .catch((err) => console.error("Play failed", err));
          setPlayState(PlayState.PLAYING);
        }
      }
    },
    [],
  );

  const isInitialLoadRef = useRef(true);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || isSeekingRef.current) return;
    const value = audioRef.current.currentTime;
    setCurrentTime(Number.isFinite(value) ? value : 0);
    // Persist current time (throttle this conceptually, but localStorage is fast enough for 4 times/sec)
    localStorage.setItem('aura-current-time', value.toString());
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    const value = audioRef.current.duration;
    setDuration(Number.isFinite(value) ? value : 0);

    // Resume saved time on initial load
    if (isInitialLoadRef.current && currentTime > 0) {
      if (currentTime < value) {
        audioRef.current.currentTime = currentTime;
      }
      isInitialLoadRef.current = false;
    }

    if (playState === PlayState.PLAYING) {
      audioRef.current
        .play()
        .catch((err) => console.error("Auto-play failed", err));
    }
  }, [playState, currentTime]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    if (playMode === PlayMode.LOOP_ONE) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    pauseAndResetCurrentAudio();
    const next = (currentIndex + 1) % queue.length;
    setCurrentIndex(next);
    setMatchStatus("idle");
    setPlayState(PlayState.PLAYING);
  }, [queue.length, playMode, currentIndex, pauseAndResetCurrentAudio]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    pauseAndResetCurrentAudio();
    const prev = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prev);
    setMatchStatus("idle");
    setPlayState(PlayState.PLAYING);
  }, [queue.length, currentIndex, pauseAndResetCurrentAudio]);

  const playIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;
      pauseAndResetCurrentAudio();
      setCurrentIndex(index);
      setPlayState(PlayState.PLAYING);
      setMatchStatus("idle");
    },
    [queue.length, pauseAndResetCurrentAudio],
  );

  const handleAudioEnded = useCallback(() => {
    if (playMode === PlayMode.LOOP_ONE) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .catch((err) => console.error("Play failed", err));
      }
      setPlayState(PlayState.PLAYING);
      return;
    }

    if (queue.length === 1) {
      setPlayState(PlayState.PAUSED);
      return;
    }

    playNext();
  }, [playMode, queue.length, playNext]);

  const addSongAndPlay = useCallback(
    (song: Song) => {
      // Update both queues atomically
      setQueue((prev) => {
        const newQueue = [...prev, song];
        const newIndex = newQueue.length - 1;

        // Set index and play state immediately in the same update cycle
        setCurrentIndex(newIndex);
        setPlayState(PlayState.PLAYING);
        setMatchStatus("idle");

        return newQueue;
      });

      setOriginalQueue((prev) => [...prev, song]);
    },
    [setQueue, setOriginalQueue],
  );

  const handlePlaylistAddition = useCallback(
    (added: Song[], wasEmpty: boolean, autoPlay: boolean = true) => {
      if (added.length === 0) return;
      setMatchStatus("idle");
      if (wasEmpty || currentIndex === -1) {
        setCurrentIndex(0);
        setPlayState(autoPlay ? PlayState.PLAYING : PlayState.PAUSED);
      }
      if (playMode === PlayMode.SHUFFLE) {
        reorderForShuffle();
      }
    },
    [currentIndex, playMode, reorderForShuffle],
  );



  const loadLyricsFile = useCallback(
    (file?: File) => {
      if (!file || !currentSong) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const parsedLyrics = parseLyrics(text);
          updateSongInQueue(currentSong.id, { lyrics: parsedLyrics });
          setMatchStatus("success");
        }
      };
      reader.readAsText(file);
    },
    [currentSong, updateSongInQueue],
  );

  useEffect(() => {
    if (!currentSong) {
      if (matchStatus !== "idle") {
        setMatchStatus("idle");
      }
      return;
    }

    const songId = currentSong.id;
    const songTitle = currentSong.title;
    const songArtist = currentSong.artist;
    // Default to true if not explicitly set to false (i.e. undefined)
    const needsLyricsMatch = currentSong.needsLyricsMatch ?? true;
    const existingLyrics = currentSong.lyrics ?? [];
    const isNeteaseSong = currentSong.isNetease;
    const songNeteaseId = currentSong.neteaseId;

    let cancelled = false;

    const markMatchFailed = () => {
      if (cancelled) return;
      updateSongInQueue(songId, {
        needsLyricsMatch: false,
      });
      setMatchStatus("failed");
    };

    const markMatchSuccess = () => {
      if (cancelled) return;
      setMatchStatus("success");
    };

    if (existingLyrics.length > 0) {
      markMatchSuccess();
      return;
    }

    if (!needsLyricsMatch) {
      markMatchFailed();
      return;
    }

    const fetchLyrics = async () => {
      setMatchStatus("matching");
      try {
        // Step 1: Check IndexedDB lyrics cache first
        const cachedLyrics = await fetchLocalLyrics(songId);
        if (cancelled) return;

        if (cachedLyrics) {
          // Found cached lyrics
          const parsed = mergeLyricsWithMetadata(cachedLyrics as any);
          updateSongInQueue(songId, {
            lyrics: parsed,
            needsLyricsMatch: false,
          });
          markMatchSuccess();
          return;
        }

        if (isNeteaseSong && songNeteaseId) {
          const raw = await withTimeout(
            fetchLyricsById(songNeteaseId),
            MATCH_TIMEOUT_MS,
          );
          if (cancelled) return;
          if (raw) {
            updateSongInQueue(songId, {
              lyrics: mergeLyricsWithMetadata(raw),
              needsLyricsMatch: false,
            });
            // Auto-save to IndexedDB lyrics cache
            saveLocalLyrics(songId, raw);
            markMatchSuccess();
          } else {
            markMatchFailed();
          }
        } else {
          const result = await withTimeout(
            searchAndMatchLyrics(songTitle, songArtist),
            MATCH_TIMEOUT_MS,
          );
          if (cancelled) return;
          if (result) {
            console.log(`[Lyrics] matched for "${songTitle}" - has yrc:`, !!result.yrc, "has tLrc:", !!result.tLrc);

            // Enrich metadata if missing
            const updates: Partial<Song> = {
              lyrics: mergeLyricsWithMetadata(result),
              needsLyricsMatch: false,
            };

            // Log word-by-word status
            const hasWords = updates.lyrics?.some(l => l.words && l.words.length > 0);
            console.log(`[Lyrics] parsed lines: ${updates.lyrics?.length}, has word timing: ${hasWords}`);

            if (!currentSong.coverUrl && result.coverUrl) {
              updates.coverUrl = result.coverUrl;
            }

            updateSongInQueue(songId, updates);

            // Auto-save to IndexedDB lyrics cache
            saveLocalLyrics(songId, result);
            markMatchSuccess();
          } else {
            markMatchFailed();
          }
        }
      } catch (error) {
        console.warn("Lyrics matching failed:", error);
        markMatchFailed();
      }
    };

    fetchLyrics();

    return () => {
      cancelled = true;
    };
  }, [currentSong?.id, mergeLyricsWithMetadata, updateSongInQueue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleAudioError = () => {
      console.warn("Audio playback error detected");
      audio.pause();
      audio.currentTime = 0;
      setPlayState(PlayState.PAUSED);
      setCurrentTime(0);
    };

    audio.addEventListener("error", handleAudioError);
    return () => {
      audio.removeEventListener("error", handleAudioError);
    };
  }, [audioRef]);

  // Provide high-precision time updates directly from the native audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleNativeTimeUpdate = () => {
      if (isSeekingRef.current) return;
      const value = audio.currentTime;
      setCurrentTime(Number.isFinite(value) ? value : 0);
    };

    audio.addEventListener("timeupdate", handleNativeTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", handleNativeTimeUpdate);
    };
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleDurationChange = () => {
      const value = audio.duration;
      setDuration(Number.isFinite(value) ? value : 0);
    };

    audio.addEventListener("durationchange", handleDurationChange);
    return () => {
      audio.removeEventListener("durationchange", handleDurationChange);
    };
  }, [audioRef]);

  useEffect(() => {
    if (
      !currentSong ||
      !currentSong.coverUrl ||
      (currentSong.colors && currentSong.colors.length > 0)
    ) {
      return;
    }

    extractColors(currentSong.coverUrl)
      .then((colors) => {
        if (colors.length > 0) {
          updateSongInQueue(currentSong.id, { colors });
        }
      })
      .catch((err) => console.warn("Color extraction failed", err));
  }, [currentSong, updateSongInQueue]);

  useEffect(() => {
    if (queue.length === 0) {
      // Don't reset currentIndex if queue hasn't loaded yet from IndexedDB
      if (!queueHasLoadedRef.current) return;
      if (currentIndex === -1) return;
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setPlayState(PlayState.PAUSED);
      setCurrentIndex(-1);
      setCurrentTime(0);
      setDuration(0);
      setMatchStatus("idle");
      return;
    }

    // Mark that queue has been populated at least once
    queueHasLoadedRef.current = true;

    if (currentIndex === -1) return; // Wait for initialization

    if (currentIndex >= queue.length || !queue[currentIndex]) {
      if (queue.length > 0) {
        const nextIndex = Math.max(0, Math.min(queue.length - 1, currentIndex));
        setCurrentIndex(nextIndex);
      }
      setMatchStatus("idle");
    }
  }, [queue, currentIndex]);

  const [speed, setSpeed] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem('aura-speed') || '1');
    } catch { return 1; }
  });
  const [preservesPitch, setPreservesPitch] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aura-pitch');
      return saved ? saved === 'true' : true;
    } catch { return true; }
  });
  const [resolvedAudioSrc, setResolvedAudioSrc] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);

  const handleSetSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  const handleTogglePreservesPitch = useCallback(() => {
    setPreservesPitch((prev) => !prev);
  }, []);

  // Ensure playback rate is applied when song changes or play state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.preservesPitch = preservesPitch;
      audioRef.current.playbackRate = speed;
    }
  }, [currentSong, playState, speed, preservesPitch]);

  useEffect(() => {
    let canceled = false;
    let currentObjectUrl: string | null = null;
    let controller: AbortController | null = null;

    const releaseObjectUrl = () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }
    };

    if (!currentSong?.fileUrl) {
      releaseObjectUrl();
      setResolvedAudioSrc(null);
      setIsBuffering(false);
      setBufferProgress(0);
      return () => {
        canceled = true;
        controller?.abort();
        releaseObjectUrl();
      };
    }

    const fileUrl = currentSong.fileUrl;

    // Already a blob or data URL - use directly
    if (fileUrl.startsWith("blob:") || fileUrl.startsWith("data:")) {
      releaseObjectUrl();
      setResolvedAudioSrc(fileUrl);
      setIsBuffering(false);
      setBufferProgress(1);
      return () => {
        canceled = true;
      };
    }

    // Check in-memory cache
    const cachedBlob = audioResourceCache.get(fileUrl);
    if (cachedBlob) {
      releaseObjectUrl();
      currentObjectUrl = URL.createObjectURL(cachedBlob);
      setResolvedAudioSrc(currentObjectUrl);
      setIsBuffering(false);
      setBufferProgress(1);
      return () => {
        canceled = true;
        releaseObjectUrl();
      };
    }

    // For http(s) URLs (e.g. Netease), use directly and let browser handle buffering
    releaseObjectUrl();
    setResolvedAudioSrc(null); // Use original fileUrl via fallback in audio element
    setIsBuffering(false);
    setBufferProgress(0);

    return () => {
      canceled = true;
      controller?.abort();
      releaseObjectUrl();
    };
  }, [currentSong?.fileUrl]);

  // --- Persistence Effects ---
  useEffect(() => {
    if (currentIndex !== -1) {
      localStorage.setItem('aura-current-index', currentIndex.toString());
    }
  }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem('aura-play-mode', playMode.toString());
  }, [playMode]);

  useEffect(() => {
    localStorage.setItem('aura-speed', speed.toString());
  }, [speed]);

  useEffect(() => {
    localStorage.setItem('aura-pitch', preservesPitch.toString());
  }, [preservesPitch]);

  return {
    audioRef,
    currentSong,
    currentIndex,
    playState,
    currentTime,
    duration,
    playMode,
    matchStatus,
    accentColor,
    speed,
    preservesPitch,
    togglePlay,
    toggleMode,
    handleSeek,
    playNext,
    playPrev,
    playIndex,
    handleTimeUpdate,
    handleLoadedMetadata,
    handlePlaylistAddition,
    loadLyricsFile,
    addSongAndPlay,
    handleAudioEnded,
    setSpeed: handleSetSpeed,
    togglePreservesPitch: handleTogglePreservesPitch,
    pitch: 0, // Default pitch
    setPitch: (pitch: number) => { }, // Placeholder
    play,
    pause,
    resolvedAudioSrc,
    isBuffering,
    bufferProgress,
  };
};
