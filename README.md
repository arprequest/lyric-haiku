# Lyric Haiku

Transform song lyrics into haiku poetry. Search for any song and generate a haiku with the perfect 5-7-5 syllable pattern.

**Live:** [haiku.arprequest.com](https://haiku.arprequest.com)

## Features

- **Song Search** - Search millions of songs via Genius API
- **Haiku Generation** - Automatically finds lyrics matching the 5-7-5 syllable pattern
- **Smart Matching** - Falls back to closest match when exact 5-7-5 isn't available
- **Duplicate Prevention** - Ensures all three lines are unique (no repeated chorus lines)
- **Random Artist Mode** - Generate a random haiku from your favorite artist
- **Community Haikus** - See haikus created by other users as floating bubbles
- **Share** - Copy or share your haiku to Twitter/X
- **Admin Dashboard** - Analytics and stats at `/admin`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, GSAP animations |
| Styling | CSS, Tailwind (admin only) |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) |
| Lyrics | Genius API |
| Charts | Tremor (admin dashboard) |

## Project Structure

```
├── src/
│   ├── App.jsx              # Main app component
│   ├── App.css              # Global styles
│   ├── main.jsx             # Entry point with routing
│   ├── components/
│   │   ├── LyricsInput.jsx  # Search input & random artist
│   │   ├── SearchResults.jsx # Song search results
│   │   ├── HaikuDisplay.jsx # Generated haiku view
│   │   └── HaikuBubbles.jsx # Floating community haikus
│   ├── utils/
│   │   ├── haikuGenerator.js    # Haiku generation algorithm
│   │   └── syllableCounter.js   # Syllable counting
│   └── admin/
│       ├── AdminApp.jsx     # Dashboard with Tremor charts
│       ├── AdminLogin.jsx   # Password login
│       └── admin.css        # Admin styles
├── functions/
│   └── api/
│       ├── search.js        # Genius song search
│       ├── lyrics.js        # Lyrics fetcher
│       ├── haikus.js        # Community haikus CRUD
│       ├── track.js         # Event tracking
│       └── admin/
│           ├── login.js     # Auth endpoint
│           ├── stats.js     # D1 stats
│           └── analytics.js # Cloudflare analytics
├── schema.sql               # D1 database schema
└── package.json
```

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deployment

Deployed on Cloudflare Pages with automatic deploys from GitHub.

### Environment Variables

Set in Cloudflare Pages → Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GENIUS_ACCESS_TOKEN` | Yes | Genius API token for lyrics |
| `ADMIN_PASSWORD` | Yes | Admin dashboard password |
| `CF_API_TOKEN` | No | Cloudflare API token (for analytics) |
| `CF_ZONE_ID` | No | Cloudflare zone ID (for analytics) |

### D1 Database

Create a D1 database and bind it as `DB` in Pages settings. Initialize with:

```sql
-- Run in D1 console
CREATE TABLE IF NOT EXISTS haikus (
  id TEXT PRIMARY KEY,
  line1 TEXT NOT NULL,
  line2 TEXT NOT NULL,
  line3 TEXT NOT NULL,
  song_title TEXT,
  song_artist TEXT,
  is_exact INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_haikus_created_at ON haikus(created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  data TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type_date ON events(type, created_at DESC);
```

## How It Works

1. **Search** - User searches for a song, Genius API returns matches
2. **Fetch Lyrics** - Selected song's lyrics are fetched and parsed
3. **Generate Haiku** - Algorithm scans lyrics for lines with 5, 7, and 5 syllables
4. **Fallback** - If exact match not found, uses closest syllable counts
5. **Save** - Haiku saved to D1 for community display
6. **Display** - Haiku shown with animation, shareable to social media

## Admin Dashboard

Access at `/admin` with your configured password.

- Total haikus created
- Haikus by day (chart)
- Top artists and songs
- Exact vs approximate haiku ratio
- Traffic stats (requires CF_API_TOKEN)
- Recent events log

## License

MIT
