
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import musicRoutes from './routes.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const MUSIC_DIR = process.env.MUSIC_DIR || path.join(__dirname, '../music');

// Ensure music directory exists
if (!fs.existsSync(MUSIC_DIR)) {
    console.log(`Creating music directory at ${MUSIC_DIR}`);
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Serve static music files
app.use('/music', express.static(MUSIC_DIR));

// API Routes
app.use('/api', musicRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving music from ${MUSIC_DIR}`);
});
