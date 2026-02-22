// GET /api/haikus/:id - Fetch a single haiku by ID

export async function onRequestGet(context) {
  const { env, params } = context
  const id = params.id

  if (!id) {
    return Response.json({ error: 'Missing haiku ID' }, { status: 400 })
  }

  try {
    const row = await env.DB.prepare(`
      SELECT id, line1, line2, line3, song_title, song_artist, is_exact, created_at
      FROM haikus
      WHERE id = ?
    `).bind(id).first()

    if (!row) {
      return Response.json({ error: 'Haiku not found' }, { status: 404 })
    }

    return Response.json({
      id: row.id,
      haiku: [row.line1, row.line2, row.line3],
      song: row.song_title ? {
        title: row.song_title,
        artist: row.song_artist
      } : null,
      isExact: row.is_exact === 1,
      createdAt: row.created_at
    })
  } catch (error) {
    console.error('Error fetching haiku:', error)
    return Response.json({ error: 'Failed to fetch haiku' }, { status: 500 })
  }
}
