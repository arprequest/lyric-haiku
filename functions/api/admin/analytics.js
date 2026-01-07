// GET /api/admin/analytics - Fetch Cloudflare Web Analytics

function isAuthenticated(request) {
  const cookie = request.headers.get('Cookie') || ''
  return cookie.includes('admin_session=')
}

const ANALYTICS_QUERY = `
  query GetZoneAnalytics($zoneTag: String!, $since: String!, $until: String!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        dailyData: httpRequests1dGroups(
          limit: 7
          filter: { date_geq: $since, date_leq: $until }
          orderBy: [date_ASC]
        ) {
          sum {
            requests
            pageViews
            bytes
            countryMap {
              clientCountryName
              requests
            }
            browserMap {
              uaBrowserFamily
              pageViews
            }
          }
          uniq {
            uniques
          }
          dimensions {
            date
          }
        }
      }
    }
  }
`

export async function onRequestGet(context) {
  const { env, request } = context

  // Check authentication
  if (!isAuthenticated(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if analytics is configured
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) {
    return Response.json({
      configured: false,
      message: 'Cloudflare Analytics not configured. Add CF_API_TOKEN and CF_ZONE_ID environment variables.'
    })
  }

  try {
    const now = new Date()
    const until = now.toISOString().split('T')[0]
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: ANALYTICS_QUERY,
        variables: {
          zoneTag: env.CF_ZONE_ID,
          since,
          until
        }
      })
    })

    const data = await response.json()

    if (data.errors) {
      console.error('Analytics API errors:', data.errors)
      return Response.json({ error: 'Failed to fetch analytics', details: data.errors }, { status: 500 })
    }

    // Extract and format the data
    const zones = data.data?.viewer?.zones || []
    const zone = zones[0] || {}
    const dailyData = zone.dailyData || []

    // Calculate totals
    let totalRequests = 0
    let totalPageViews = 0
    let totalUniques = 0
    const byDay = []

    for (const day of dailyData.slice(0, 7)) {
      if (day.dimensions) {
        totalRequests += day.sum?.requests || 0
        totalPageViews += day.sum?.pageViews || 0
        totalUniques += day.uniq?.uniques || 0
        byDay.push({
          date: day.dimensions.date,
          requests: day.sum?.requests || 0,
          pageViews: day.sum?.pageViews || 0,
          visitors: day.uniq?.uniques || 0
        })
      }
    }

    // Aggregate country and browser data across all days
    const countryTotals = {}
    const browserTotals = {}

    for (const day of dailyData) {
      for (const c of day.sum?.countryMap || []) {
        countryTotals[c.clientCountryName] = (countryTotals[c.clientCountryName] || 0) + c.requests
      }
      for (const b of day.sum?.browserMap || []) {
        const name = b.uaBrowserFamily || 'Unknown'
        browserTotals[name] = (browserTotals[name] || 0) + b.pageViews
      }
    }

    const countries = Object.entries(countryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const browsers = Object.entries(browserTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    return Response.json({
      configured: true,
      totals: {
        requests: totalRequests,
        pageViews: totalPageViews,
        visitors: totalUniques
      },
      byDay,
      countries,
      browsers
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return Response.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
