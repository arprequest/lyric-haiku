import { useState } from 'react'
import LyricsInput from './components/LyricsInput'
import HaikuDisplay from './components/HaikuDisplay'
import SearchResults from './components/SearchResults'
import { generateHaiku } from './utils/haikuGenerator'

const GENIUS_API_KEY = import.meta.env.VITE_GENIUS_API_KEY

export default function App() {
  const [haikuResult, setHaikuResult] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [view, setView] = useState('input') // 'input' or 'result'

  const handleLyricsSubmit = (lyrics) => {
    const result = generateHaiku(lyrics)
    setHaikuResult(result)
    setView('result')
  }

  const handleSearch = async (query) => {
    if (!GENIUS_API_KEY) {
      alert('Genius API key not configured. Please paste lyrics directly.')
      return
    }

    setIsSearching(true)
    setSearchResults([])

    try {
      // Note: Direct browser requests to Genius API may be blocked by CORS
      // In production, you'd proxy this through a serverless function
      const response = await fetch(
        `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${GENIUS_API_KEY}`
          }
        }
      )

      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      const songs = data.response.hits.map((hit) => ({
        id: hit.result.id,
        title: hit.result.title,
        artist: hit.result.primary_artist.name,
        thumbnail: hit.result.song_art_image_thumbnail_url,
        url: hit.result.url
      }))

      setSearchResults(songs)
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. This may be due to CORS restrictions. Please paste lyrics directly.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSong = (song) => {
    // Open lyrics page in new tab for user to copy
    window.open(song.url, '_blank')
  }

  const handleReset = () => {
    setHaikuResult(null)
    setSearchResults([])
    setView('input')
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">
          <span className="logo-accent">Lyric</span> Haiku
        </h1>
        <p className="tagline">Transform songs into poetry</p>
      </header>

      <main className="main">
        {view === 'input' ? (
          <div className="input-section">
            <div className="hero-text">
              <h2>Create haiku from<br /><span className="highlight">your favorite lyrics</span></h2>
              <p>Paste song lyrics and we'll find lines with the perfect 5-7-5 syllable pattern</p>
            </div>

            <LyricsInput
              onLyricsSubmit={handleLyricsSubmit}
              onSearch={handleSearch}
              isSearching={isSearching}
            />

            <SearchResults
              results={searchResults}
              onSelectSong={handleSelectSong}
              isLoading={isSearching}
            />
          </div>
        ) : (
          <HaikuDisplay result={haikuResult} onReset={handleReset} />
        )}
      </main>

      <footer className="footer">
        <p>
          Built with React • Syllables counted with precision
        </p>
      </footer>
    </div>
  )
}
