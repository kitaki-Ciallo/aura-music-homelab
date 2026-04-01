import { mergeLyricsWithMetadata } from './services/lyricsService.js';
console.log(mergeLyricsWithMetadata({
  lrc: '[00:00.00]hello',
  yrc: '[0,100](0,50,0)he(50,50,0)llo',
  metadata: []
}));
