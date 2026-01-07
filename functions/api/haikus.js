// GET /api/haikus - Fetch community haikus
// POST /api/haikus - Save a new haiku

export async function onRequestGet(context) {
  const { env } = context

  try {
    // Fetch 20 most recent haikus
    const result = await env.DB.prepare(`
      SELECT id, line1, line2, line3, song_title, song_artist, is_exact, created_at
      FROM haikus
      ORDER BY created_at DESC
      LIMIT 20
    `).all()

    const haikus = result.results.map(row => ({
      id: row.id,
      haiku: [row.line1, row.line2, row.line3],
      song: row.song_title ? {
        title: row.song_title,
        artist: row.song_artist
      } : null,
      isExact: row.is_exact === 1,
      createdAt: row.created_at
    }))

    return Response.json({ haikus })
  } catch (error) {
    console.error('Error fetching haikus:', error)
    return Response.json({ error: 'Failed to fetch haikus', haikus: [] }, { status: 500 })
  }
}

export async function onRequestPost(context) {
  const { env, request } = context

  try {
    const body = await request.json()
    const { id, haiku, song, isExact } = body

    // Validate
    if (!id || !haiku || !Array.isArray(haiku) || haiku.length !== 3) {
      return Response.json({ error: 'Invalid haiku data' }, { status: 400 })
    }

    // Insert haiku
    await env.DB.prepare(`
      INSERT INTO haikus (id, line1, line2, line3, song_title, song_artist, is_exact, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      haiku[0],
      haiku[1],
      haiku[2],
      song?.title || null,
      song?.artist || null,
      isExact ? 1 : 0,
      Date.now()
    ).run()

    return Response.json({ success: true })
  } catch (error) {
    // Ignore duplicate key errors (same haiku submitted twice)
    if (error.message?.includes('UNIQUE constraint')) {
      return Response.json({ success: true })
    }
    console.error('Error saving haiku:', error)
    return Response.json({ error: 'Failed to save haiku' }, { status: 500 })
  }
}
