// GET /artist/:slug - Server-rendered artist page listing all haikus for that artist

export async function onRequestGet(context) {
  const { env, params } = context
  const slug = params.slug

  if (!slug) {
    return new Response('Not found', { status: 404 })
  }

  try {
    // Convert slug back to a search pattern (e.g. "taylor-swift" → "taylor swift")
    const searchName = slug.replace(/-/g, ' ')

    const result = await env.DB.prepare(`
      SELECT id, line1, line2, line3, song_title, song_artist
      FROM haikus
      WHERE LOWER(song_artist) LIKE LOWER(?)
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(`%${searchName}%`).all()

    if (!result.results.length) {
      return new Response(notFoundPage(slug), {
        status: 404,
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      })
    }

    // Use the actual artist name from the first result
    const artistName = result.results[0].song_artist
    const pageUrl = `https://lyric-haiku.com/artist/${slug}`
    const title = `${artistName} Haikus — Lyric Haiku`
    const description = `${result.results.length} haiku${result.results.length !== 1 ? 's' : ''} generated from ${artistName} lyrics. Each poem uses the 5-7-5 syllable pattern.`

    const haikusHtml = result.results.map(row => {
      const haiku = [row.line1, row.line2, row.line3]
      return `
    <a href="/haiku/${escHtml(row.id)}" class="haiku-card">
      <div class="haiku-lines">
        ${haiku.map(line => `<p>${escHtml(line)}</p>`).join('\n        ')}
      </div>
      ${row.song_title ? `<div class="haiku-credit">${escHtml(row.song_title)}</div>` : ''}
    </a>`
    }).join('\n')

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
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escHtml(pageUrl)}" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:site_name" content="Lyric Haiku" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />

  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": ${JSON.stringify(title)},
    "description": ${JSON.stringify(description)},
    "url": ${JSON.stringify(pageUrl)}
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
      padding: 2rem 1rem;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 680px; margin: 0 auto; }
    .logo {
      display: inline-block;
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #0a2540;
      margin-bottom: 2rem;
      text-decoration: none;
    }
    .logo span { color: #635bff; }
    h1 {
      font-size: clamp(1.4rem, 4vw, 2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.4rem;
    }
    .subtitle {
      color: #8898aa;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .haiku-card {
      display: block;
      background: #f6f9fc;
      border: 1px solid #e6ebf1;
      border-radius: 12px;
      padding: 1.25rem;
      text-decoration: none;
      transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    }
    .haiku-card:hover {
      border-color: #635bff;
      box-shadow: 0 4px 16px rgba(99,91,255,0.1);
      transform: translateY(-2px);
    }
    .haiku-lines p {
      font-style: italic;
      color: #0a2540;
      line-height: 1.7;
      font-size: 0.95rem;
    }
    .haiku-credit {
      margin-top: 0.75rem;
      font-size: 0.75rem;
      color: #8898aa;
    }
    .cta {
      text-align: center;
      padding-top: 1.5rem;
      border-top: 1px solid #e6ebf1;
    }
    .cta p { color: #8898aa; font-size: 0.85rem; margin-bottom: 1rem; }
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
  <div class="container">
    <a href="https://lyric-haiku.com" class="logo"><span>Lyric</span> Haiku</a>
    <h1>${escHtml(artistName)}</h1>
    <p class="subtitle">${result.results.length} haiku${result.results.length !== 1 ? 's' : ''} from their lyrics</p>

    <div class="grid">
      ${haikusHtml}
    </div>

    <div class="cta">
      <p>Generate a haiku from any song</p>
      <a href="https://lyric-haiku.com" class="btn-generate">Try It</a>
    </div>
  </div>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Error rendering artist page:', error)
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

function notFoundPage(slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Artist Not Found — Lyric Haiku</title>
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
    <h1>No haikus found</h1>
    <p>No haikus have been generated from this artist's songs yet.</p>
    <a href="https://lyric-haiku.com">Generate the first one &rarr;</a>
  </div>
</body>
</html>`
}
