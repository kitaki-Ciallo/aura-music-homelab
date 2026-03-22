
const path = require('path');

const file = "c:\\Users\\北秋ovo\\Downloads\\aura-music-homelab-1\\music\\CloudMusic\\放課後ティータイム - NO, Thank You!.wav";

// Simulation of server logic
let title = path.basename(file, path.extname(file));
let artist = 'Unknown Artist';

// Assume metadata extraction failed or returned nothing useful
// So title remains basename, artist remains 'Unknown Artist'

console.log(`Initial Title: ${title}`);
console.log(`Initial Artist: ${artist}`);
console.log(`Condition check: ${title === path.basename(file, path.extname(file))} || ${artist === 'Unknown Artist'}`);

if (title === path.basename(file, path.extname(file)) || title === 'Unknown Title' || artist === 'Unknown Artist') {
    const basename = path.basename(file, path.extname(file));
    const parts = basename.split(' - ');
    if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim(); // Handle multiple separators if any
    } else {
        title = basename;
    }
    console.log(`[Parsed] Artist: ${artist}`);
    console.log(`[Parsed] Title: ${title}`);
} else {
    console.log("Fallback block NOT entered.");
}
