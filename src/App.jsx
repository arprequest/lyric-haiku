import { useState } from 'react'
import LyricsInput from './components/LyricsInput'
import HaikuDisplay from './components/HaikuDisplay'
import SearchResults from './components/SearchResults'
import { generateHaiku } from './utils/haikuGenerator'

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
    setIsSearching(true)
    setSearchResults([])

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)

      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      setSearchResults(data.songs || [])
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again or paste lyrics directly.')
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
