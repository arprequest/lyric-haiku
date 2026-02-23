// GET /haiku/:id - Server-rendered haiku permalink page

export async function onRequestGet(context) {
  const { env, params } = context
  const id = params.id

  if (!id) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const row = await env.DB.prepare(`
      SELECT id, line1, line2, line3, song_title, song_artist, is_exact
      FROM haikus
      WHERE id = ?
    `).bind(id).first()

    if (!row) {
      return new Response(notFoundPage(), {
        status: 404,
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      })
    }

    const haiku = [row.line1, row.line2, row.line3]
    const title = row.song_title
      ? `${row.song_title} by ${row.song_artist} — Lyric Haiku`
      : 'Lyric Haiku'
    const description = haiku.join(' / ')
    const pageUrl = `https://lyric-haiku.com/haiku/${row.id}`
    const ogImageUrl = `https://lyric-haiku.com/og/${row.id}`
    const spotifyUrl = row.song_title
      ? `https://open.spotify.com/search/${encodeURIComponent(`${row.song_title} ${row.song_artist}`)}`
      : null
    const appleMusicUrl = row.song_title
      ? `https://music.apple.com/search?term=${encodeURIComponent(`${row.song_title} ${row.song_artist}`)}`
      : null
    const artistSlug = row.song_artist
      ? row.song_artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : null

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  <link rel="canonical" href="${escHtml(pageUrl)}" />
  <meta name="theme-color" content="#635bff" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${escHtml(pageUrl)}" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:site_name" content="Lyric Haiku" />
  <meta property="og:image" content="${escHtml(ogImageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image" content="${escHtml(ogImageUrl)}" />

  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": ${JSON.stringify(title)},
    "description": ${JSON.stringify(description)},
    "text": ${JSON.stringify(haiku.join('\n'))},
    "url": ${JSON.stringify(pageUrl)}${row.song_title ? `,
    "isBasedOn": {
      "@type": "MusicRecording",
      "name": ${JSON.stringify(row.song_title)},
      "byArtist": { "@type": "MusicGroup", "name": ${JSON.stringify(row.song_artist)} }
    }` : ''}
  }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #ffffff;
      color: #0a2540;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .logo {
      display: inline-block;
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #0a2540;
      margin-bottom: 2.5rem;
      text-decoration: none;
    }
    .logo span { color: #635bff; }
    .haiku {
      margin: 0 auto 1.5rem;
    }
    .haiku p {
      font-size: clamp(1.1rem, 3vw, 1.35rem);
      line-height: 1.8;
      font-style: italic;
      color: #0a2540;
    }
    .credit {
      font-size: 0.8rem;
      color: #8898aa;
      margin-bottom: 2rem;
    }
    .credit a {
      color: #425466;
      text-decoration: none;
    }
    .credit a:hover { color: #635bff; }
    .listen {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
    }
    .listen a {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 1rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 500;
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .listen a:hover { opacity: 0.8; }
    .btn-spotify { background: #1DB954; color: #000; }
    .btn-apple { background: #fc3c44; color: #fff; }
    .divider {
      border: none;
      border-top: 1px solid #e6ebf1;
      margin: 0 auto 2rem;
      max-width: 200px;
    }
    .cta {
      font-size: 0.85rem;
      color: #8898aa;
      margin-bottom: 1rem;
    }
    .btn-generate {
      display: inline-block;
      padding: 0.6rem 1.5rem;
      background: #635bff;
      color: #ffffff;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn-generate:hover { background: #7a73ff; }
  </style>
</head>
<body>
  <div class="card">
    <a href="https://lyric-haiku.com" class="logo"><span>Lyric</span> Haiku</a>

    <div class="haiku">
      ${haiku.map(line => `<p>${escHtml(line)}</p>`).join('\n      ')}
    </div>

    ${row.song_title ? `<p class="credit">From &ldquo;${escHtml(row.song_title)}&rdquo; by ${artistSlug ? `<a href="/artist/${escHtml(artistSlug)}">${escHtml(row.song_artist)}</a>` : escHtml(row.song_artist)}</p>` : ''}

    ${spotifyUrl || appleMusicUrl ? `<div class="listen">
      ${spotifyUrl ? `<a href="${escHtml(spotifyUrl)}" class="btn-spotify" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        Listen on Spotify
      </a>` : ''}
      ${appleMusicUrl ? `<a href="${escHtml(appleMusicUrl)}" class="btn-apple" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.454.025C4.948.ostringstream 4.432.12 3.947.3c-1.17.48-1.994 1.32-2.467 2.5-.22.56-.335 1.14-.367 1.74-.007.15-.012.302-.013.453v11.501c.01.15.017.302.025.453.056.857.235 1.67.59 2.44.633 1.34 1.664 2.24 3.066 2.73.55.19 1.12.285 1.705.3.16.005.32.01.48.01h11.502c.16 0 .32-.005.48-.01.585-.015 1.155-.11 1.705-.3 1.402-.49 2.433-1.39 3.066-2.73.355-.77.534-1.583.59-2.44.008-.15.015-.302.025-.453V6.577c-.003-.15-.008-.302-.013-.453zm-4.22 9.03c-.158.422-.43.76-.83.99-.303.175-.63.27-.975.28-.47.01-.91-.11-1.32-.34-.41-.23-.82-.46-1.23-.69-.46-.26-.93-.52-1.39-.78-.5-.28-1.003-.56-1.5-.845a.2.2 0 00-.1-.03c-.03 0-.06.008-.09.02-.5.28-1.003.56-1.5.845-.46.26-.93.52-1.39.78-.41.23-.82.46-1.23.69-.41.23-.85.35-1.32.34-.345-.01-.672-.105-.975-.28-.4-.23-.672-.568-.83-.99-.12-.32-.15-.65-.09-.99.06-.33.21-.63.42-.88.21-.25.46-.44.75-.57.18-.08.37-.13.56-.16V8.746c0-.2.015-.4.05-.6.07-.41.24-.79.51-1.1.27-.31.6-.53.98-.66.19-.065.385-.1.58-.11.195-.01.39 0 .585.03l3.455 1.02 3.455-1.02c.195-.03.39-.04.585-.03.195.01.39.045.58.11.38.13.71.35.98.66.27.31.44.69.51 1.1.035.2.05.4.05.6v6.04c.19.03.38.08.56.16.29.13.54.32.75.57.21.25.36.55.42.88.06.34.03.67-.09.99z"/></svg>
        Listen on Apple Music
      </a>` : ''}
    </div>` : ''}

    <hr class="divider" />
    <p class="cta">Create your own haiku from any song</p>
    <a href="https://lyric-haiku.com" class="btn-generate">Generate a Haiku</a>
  </div>
</body>
</html>`

    const response = new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    })

    context.waitUntil(
      env.DB.prepare('INSERT INTO events (type, data, created_at) VALUES (?, ?, ?)')
        .bind('permalink_view', JSON.stringify({ id: row.id, song_title: row.song_title, song_artist: row.song_artist }), Date.now())
        .run()
        .catch(() => {})
    )

    return response
  } catch (error) {
    console.error('Error rendering haiku page:', error)
    return new Response('Server error', { status: 500 })
  }
}

function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Haiku Not Found — Lyric Haiku</title>
  <style>
    body { background:#ffffff; color:#0a2540; font-family:'Inter',-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; text-align:center; padding:2rem; -webkit-font-smoothing:antialiased; }
    h1 { font-size:1.5rem; font-weight:800; margin-bottom:1rem; }
    p { color:#8898aa; margin-bottom:1.5rem; }
    a { color:#635bff; text-decoration:none; }
    a:hover { color:#7a73ff; }
  </style>
</head>
<body>
  <div>
    <h1>Haiku not found</h1>
    <p>This haiku may have been removed or the link is incorrect.</p>
    <a href="https://lyric-haiku.com">Generate your own &rarr;</a>
  </div>
</body>
</html>`
}
