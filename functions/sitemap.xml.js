// GET /sitemap.xml - Dynamic sitemap including all haiku permalink pages

export async function onRequestGet(context) {
  const { env } = context

  const urls = [
    { loc: 'https://lyric-haiku.com/', priority: '1.0', changefreq: 'weekly' }
  ]

  try {
    const [haikusResult, artistsResult] = await Promise.all([
      env.DB.prepare(`SELECT id, created_at FROM haikus ORDER BY created_at DESC LIMIT 49000`).all(),
      env.DB.prepare(`SELECT DISTINCT song_artist FROM haikus WHERE song_artist IS NOT NULL`).all()
    ])

    for (const row of haikusResult.results) {
      const date = new Date(row.created_at).toISOString().split('T')[0]
      urls.push({
        loc: `https://lyric-haiku.com/haiku/${row.id}`,
        lastmod: date,
        priority: '0.7',
        changefreq: 'never'
      })
    }

    for (const row of artistsResult.results) {
      const slug = row.song_artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      urls.push({
        loc: `https://lyric-haiku.com/artist/${slug}`,
        priority: '0.8',
        changefreq: 'weekly'
      })
    }
  } catch (error) {
    console.error('Sitemap DB error:', error)
  }

  const urlEntries = urls.map(u => `
  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml;charset=UTF-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
