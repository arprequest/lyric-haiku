// GET /api/admin/stats - Return D1 database stats

function isAuthenticated(request) {
  const cookie = request.headers.get('Cookie') || ''
  return cookie.includes('admin_session=')
}

export async function onRequestGet(context) {
  const { env, request } = context

  // Check authentication
  if (!isAuthenticated(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    // Run all queries in parallel
    const [
      totalHaikus,
      haikusByDay,
      topArtists,
      topSongs,
      exactRatio,
      contentStats,
      topPermalinks,
      topArtistPages,
      todayEvents,
      recentEvents,
      eventsByType
    ] = await Promise.all([
      // Total haikus
      env.DB.prepare('SELECT COUNT(*) as count FROM haikus').first(),

      // Haikus by day (last 7 days)
      env.DB.prepare(`
        SELECT DATE(created_at/1000, 'unixepoch') as day, COUNT(*) as count
        FROM haikus
        WHERE created_at > ?
        GROUP BY day
        ORDER BY day ASC
      `).bind(sevenDaysAgo).all(),

      // Top artists
      env.DB.prepare(`
        SELECT song_artist as name, COUNT(*) as value
        FROM haikus
        WHERE song_artist IS NOT NULL
        GROUP BY song_artist
        ORDER BY value DESC
        LIMIT 10
      `).all(),

      // Top songs
      env.DB.prepare(`
        SELECT song_title || ' - ' || song_artist as name, COUNT(*) as value
        FROM haikus
        WHERE song_title IS NOT NULL
        GROUP BY song_title, song_artist
        ORDER BY value DESC
        LIMIT 10
      `).all(),

      // Exact vs approximate ratio
      env.DB.prepare(`
        SELECT is_exact, COUNT(*) as count
        FROM haikus
        GROUP BY is_exact
      `).all(),

      // Content stats: distinct artists, songs
      env.DB.prepare(`
        SELECT
          COUNT(DISTINCT song_artist) as distinctArtists,
          COUNT(DISTINCT song_title || '|' || song_artist) as distinctSongs
        FROM haikus
        WHERE song_artist IS NOT NULL
      `).first(),

      // Top permalink pages by views
      env.DB.prepare(`
        SELECT json_extract(data, '$.song_title') || ' - ' || json_extract(data, '$.song_artist') as name,
               COUNT(*) as value
        FROM events
        WHERE type = 'permalink_view'
          AND json_extract(data, '$.song_title') IS NOT NULL
        GROUP BY json_extract(data, '$.id')
        ORDER BY value DESC
        LIMIT 10
      `).all(),

      // Top artist pages by views
      env.DB.prepare(`
        SELECT json_extract(data, '$.artist') as name, COUNT(*) as value
        FROM events
        WHERE type = 'artist_view'
        GROUP BY json_extract(data, '$.slug')
        ORDER BY value DESC
        LIMIT 10
      `).all(),

      // Today's event counts by type
      env.DB.prepare(`
        SELECT type, COUNT(*) as count
        FROM events
        WHERE created_at > ?
        GROUP BY type
      `).bind(oneDayAgo).all(),

      // Recent events
      env.DB.prepare(`
        SELECT id, type, data, created_at
        FROM events
        ORDER BY created_at DESC
        LIMIT 50
      `).all(),

      // Events by type (all time)
      env.DB.prepare(`
        SELECT type, COUNT(*) as count
        FROM events
        GROUP BY type
      `).all()
    ])

    // Process today's events into a map
    const todayEventMap = {}
    for (const row of todayEvents.results || []) {
      todayEventMap[row.type] = row.count
    }

    // All-time event totals
    const allTimeMap = {}
    for (const row of eventsByType.results || []) {
      allTimeMap[row.type] = row.count
    }

    return Response.json({
      haikus: {
        total: totalHaikus?.count || 0,
        byDay: haikusByDay.results || [],
        topArtists: topArtists.results || [],
        topSongs: topSongs.results || [],
        exactCount: exactRatio.results?.find(r => r.is_exact === 1)?.count || 0,
        approximateCount: exactRatio.results?.find(r => r.is_exact === 0)?.count || 0
      },
      content: {
        distinctArtists: contentStats?.distinctArtists || 0,
        distinctSongs: contentStats?.distinctSongs || 0,
        permalinkViewsTotal: allTimeMap['permalink_view'] || 0,
        artistViewsTotal: allTimeMap['artist_view'] || 0,
        ogRequestsTotal: allTimeMap['og_request'] || 0,
        permalinkViewsToday: todayEventMap['permalink_view'] || 0,
        artistViewsToday: todayEventMap['artist_view'] || 0,
        ogRequestsToday: todayEventMap['og_request'] || 0,
        topPermalinks: topPermalinks.results || [],
        topArtistPages: topArtistPages.results || [],
      },
      events: {
        searchesToday: todayEventMap['search'] || 0,
        generatesToday: todayEventMap['generate'] || 0,
        errorsToday: todayEventMap['error'] || 0,
        recent: (recentEvents.results || []).map(e => ({
          ...e,
          data: e.data ? JSON.parse(e.data) : null
        })),
        byType: eventsByType.results || []
      }
    })
  } catch (error) {
    console.error('Stats error:', error)
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
