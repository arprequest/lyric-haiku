import { useState, useEffect } from 'react'
import {
  Card,
  Metric,
  Text,
  Title,
  AreaChart,
  BarList,
  Flex,
  Grid,
  Badge
} from '@tremor/react'
import AdminLogin from './AdminLogin'
import './admin.css'

export default function AdminApp() {
  const [authenticated, setAuthenticated] = useState(null)
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Fetch data when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchData()
    }
  }, [authenticated])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/login')
      const data = await response.json()
      setAuthenticated(data.authenticated)
    } catch {
      setAuthenticated(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/analytics')
      ])

      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    setAuthenticated(false)
    setStats(null)
    setAnalytics(null)
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatEventType = (type) => {
    const colors = {
      search: 'blue',
      generate: 'green',
      error: 'red',
      page_view: 'gray'
    }
    return <Badge color={colors[type] || 'gray'}>{type}</Badge>
  }

  // Show loading while checking auth
  if (authenticated === null) {
    return (
      <div className="admin-loading">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Show login if not authenticated
  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <Title>Lyric Haiku Admin</Title>
          <Text>Dashboard & Analytics</Text>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      {loading ? (
        <div className="admin-loading">
          <div className="loader"></div>
          <p>Loading stats...</p>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <Grid numItemsSm={2} numItemsLg={4} className="gap-4 mb-6">
            <Card decoration="top" decorationColor="indigo">
              <Text>Total Haikus</Text>
              <Metric>{stats?.haikus?.total || 0}</Metric>
            </Card>
            <Card decoration="top" decorationColor="blue">
              <Text>Visitors (7 days)</Text>
              <Metric>{analytics?.totals?.visitors || '—'}</Metric>
            </Card>
            <Card decoration="top" decorationColor="green">
              <Text>Searches Today</Text>
              <Metric>{stats?.events?.searchesToday || 0}</Metric>
            </Card>
            <Card decoration="top" decorationColor="red">
              <Text>Errors Today</Text>
              <Metric>{stats?.events?.errorsToday || 0}</Metric>
            </Card>
          </Grid>

          {/* Charts Row */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-4 mb-6">
            <Card>
              <Title>Haikus Created (7 days)</Title>
              {stats?.haikus?.byDay?.length > 0 ? (
                <AreaChart
                  className="mt-4 h-48"
                  data={stats.haikus.byDay}
                  index="day"
                  categories={['count']}
                  colors={['indigo']}
                  showLegend={false}
                />
              ) : (
                <Text className="mt-4">No data available</Text>
              )}
            </Card>

            <Card>
              <Title>Top Artists</Title>
              {stats?.haikus?.topArtists?.length > 0 ? (
                <BarList
                  data={stats.haikus.topArtists}
                  className="mt-4"
                  color="indigo"
                />
              ) : (
                <Text className="mt-4">No data available</Text>
              )}
            </Card>
          </Grid>

          {/* Traffic & Songs Row */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-4 mb-6">
            <Card>
              <Title>Traffic (7 days)</Title>
              {analytics?.byDay?.length > 0 ? (
                <AreaChart
                  className="mt-4 h-48"
                  data={analytics.byDay}
                  index="date"
                  categories={['visitors', 'pageViews']}
                  colors={['blue', 'cyan']}
                />
              ) : analytics?.configured === false ? (
                <Text className="mt-4 text-amber-600">
                  Configure CF_API_TOKEN and CF_ZONE_ID for traffic data
                </Text>
              ) : (
                <Text className="mt-4">No data available</Text>
              )}
            </Card>

            <Card>
              <Title>Top Songs</Title>
              {stats?.haikus?.topSongs?.length > 0 ? (
                <BarList
                  data={stats.haikus.topSongs}
                  className="mt-4"
                  color="violet"
                />
              ) : (
                <Text className="mt-4">No data available</Text>
              )}
            </Card>
          </Grid>

          {/* Stats Row */}
          <Grid numItemsSm={1} numItemsLg={3} className="gap-4 mb-6">
            <Card>
              <Title>Haiku Quality</Title>
              <Flex className="mt-4">
                <div>
                  <Text>Exact (5-7-5)</Text>
                  <Metric className="text-green-600">{stats?.haikus?.exactCount || 0}</Metric>
                </div>
                <div>
                  <Text>Approximate</Text>
                  <Metric className="text-amber-600">{stats?.haikus?.approximateCount || 0}</Metric>
                </div>
              </Flex>
            </Card>

            {analytics?.countries?.length > 0 && (
              <Card>
                <Title>Top Countries</Title>
                <BarList
                  data={analytics.countries}
                  className="mt-4"
                  color="blue"
                />
              </Card>
            )}

            {analytics?.browsers?.length > 0 && (
              <Card>
                <Title>Browsers</Title>
                <BarList
                  data={analytics.browsers}
                  className="mt-4"
                  color="cyan"
                />
              </Card>
            )}
          </Grid>

          {/* Recent Events */}
          <Card>
            <Title>Recent Events</Title>
            <div className="events-table mt-4">
              {stats?.events?.recent?.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.events.recent.map((event) => (
                      <tr key={event.id}>
                        <td>{formatDate(event.created_at)}</td>
                        <td>{formatEventType(event.type)}</td>
                        <td className="event-data">
                          {event.data ? JSON.stringify(event.data) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Text>No events recorded yet</Text>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
