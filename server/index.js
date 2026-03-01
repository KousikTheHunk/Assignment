const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Create uploads directory
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ADS_DIR = path.join(__dirname, 'ads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(ADS_DIR)) fs.mkdirSync(ADS_DIR, { recursive: true });

// Multer config for main video upload
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files allowed'));
  }
});

// In-memory store for video configs
const videoConfigs = {};

// Mock ads data - using publicly available short MP4s
const MOCK_ADS = [
  {
    id: 'ad1',
    title: 'TechCorp Pro — Supercharge Your Workflow',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
    skippableAfter: 5,
    advertiser: 'TechCorp',
    ctaText: 'Learn More',
    ctaUrl: '#'
  },
  {
    id: 'ad2',
    title: 'StreamMax — Watch Anything, Anywhere',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
    skippableAfter: 5,
    advertiser: 'StreamMax',
    ctaText: 'Try Free',
    ctaUrl: '#'
  },
  {
    id: 'ad3',
    title: 'CloudDrive — Store Everything Securely',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: 15,
    skippableAfter: 5,
    advertiser: 'CloudDrive',
    ctaText: 'Get Started',
    ctaUrl: '#'
  },
  {
    id: 'ad4',
    title: 'DevTools Plus — Build Faster',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    duration: 15,
    skippableAfter: 5,
    advertiser: 'DevTools Plus',
    ctaText: 'Download Now',
    ctaUrl: '#'
  }
];

// Generate chunk config based on video duration
function generateChunkConfig(duration, filename, originalName) {
  const CHUNK_DURATION = Math.max(20, Math.floor(duration / 4)); // ~4 chunks
  const chunks = [];
  let t = 0;
  let chunkId = 1;
  while (t < duration) {
    const end = Math.min(t + CHUNK_DURATION, duration);
    chunks.push({ id: chunkId++, start: parseFloat(t.toFixed(2)), end: parseFloat(end.toFixed(2)) });
    t = end;
  }

  // Place ads after chunk 1, 2, 3 (not after last)
  const adBreaks = [];
  const adPool = [...MOCK_ADS];
  for (let i = 0; i < chunks.length - 1; i++) {
    const numAds = i === 0 ? 2 : 1; // 2 ads after first chunk, 1 after others
    const ads = [];
    for (let j = 0; j < numAds; j++) {
      ads.push(adPool[(i * 2 + j) % adPool.length]);
    }
    adBreaks.push({ afterChunkId: chunks[i].id, ads });
  }

  return {
    id: uuidv4(),
    filename,
    originalName,
    duration,
    chunks,
    adBreaks,
    videoUrl: `/uploads/${filename}`
  };
}

// Upload video endpoint
app.post('/api/upload', videoUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file provided' });

  const duration = parseFloat(req.body.duration) || 120;
  const config = generateChunkConfig(duration, req.file.filename, req.file.originalname);
  videoConfigs[config.id] = config;

  res.json({ success: true, videoId: config.id, config });
});

// Update video duration after client reads metadata
app.put('/api/video/:id/duration', (req, res) => {
  const config = videoConfigs[req.params.id];
  if (!config) return res.status(404).json({ error: 'Video not found' });

  const { duration } = req.body;
  const updated = generateChunkConfig(duration, config.filename, config.originalName);
  updated.id = config.id;
  videoConfigs[config.id] = updated;
  res.json(updated);
});

// Get video config
app.get('/api/video/:id', (req, res) => {
  const config = videoConfigs[req.params.id];
  if (!config) return res.status(404).json({ error: 'Video not found' });
  res.json(config);
});

// Serve uploaded videos with range support
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`🎬 Video Ad Server running on http://localhost:${PORT}`));
