// POST /api/track - Log event (no auth, fire-and-forget)

export async function onRequestPost(context) {
  const { env, request } = context

  try {
    const { type, data } = await request.json()

    // Validate event type
    const validTypes = ['search', 'generate', 'error', 'page_view']
    if (!type || !validTypes.includes(type)) {
      return Response.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Insert event
    await env.DB.prepare(
      'INSERT INTO events (type, data, created_at) VALUES (?, ?, ?)'
    ).bind(
      type,
      data ? JSON.stringify(data) : null,
      Date.now()
    ).run()

    return Response.json({ success: true })
  } catch (error) {
    console.error('Track error:', error)
    // Don't fail the request - tracking is best-effort
    return Response.json({ success: true })
  }
}
