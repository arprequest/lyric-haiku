export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const query = url.searchParams.get('q')

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const apiKey = env.GENIUS_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const response = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    )

    const data = await response.json()

    const songs = data.response.hits.map((hit) => ({
      id: hit.result.id,
      title: hit.result.title,
      artist: hit.result.primary_artist.name,
      thumbnail: hit.result.song_art_image_thumbnail_url,
      url: hit.result.url
    }))

    return new Response(JSON.stringify({ songs }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
