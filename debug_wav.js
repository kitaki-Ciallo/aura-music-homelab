
import { parseFile } from 'music-metadata';
import path from 'path';

const file = "c:\\Users\\北秋ovo\\Downloads\\aura-music-homelab-1\\music\\CloudMusic\\放課後ティータイム - わたしの恋はホッチキス.wav";

async function debug() {
    try {
        const metadata = await parseFile(file);
        console.log('--- Extracted Title ---');
        console.log(JSON.stringify(metadata.common.title));
        console.log('--- Extracted Artist ---');
        console.log(JSON.stringify(metadata.common.artist));
        console.log('--- Extracted Album ---');
        console.log(JSON.stringify(metadata.common.album));
        console.log('--- All Common ---');
        console.log(JSON.stringify(metadata.common, null, 2));
    } catch (e) {
        console.error("Error parsing file:", e);
    }
}

debug();
