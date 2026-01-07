import { useState } from 'react'

export default function LyricsInput({ onLyricsSubmit, onSearch, onRandomArtist, isSearching, isLoadingRandom }) {
  const [lyrics, setLyrics] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [artistName, setArtistName] = useState('')
  const [activeTab, setActiveTab] = useState('paste') // 'paste', 'search', or 'random'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (lyrics.trim()) {
      onLyricsSubmit(lyrics)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch(searchQuery)
    }
  }

  const handleRandomArtist = (e) => {
    e.preventDefault()
    if (artistName.trim()) {
      onRandomArtist(artistName)
    }
  }

  return (
    <div className="lyrics-input">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          Paste Lyrics
        </button>
        <button
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search Song
        </button>
        <button
          className={`tab ${activeTab === 'random' ? 'active' : ''}`}
          onClick={() => setActiveTab('random')}
        >
          Surprise Me
        </button>
      </div>

      {activeTab === 'paste' && (
        <form onSubmit={handleSubmit} className="paste-form">
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Paste your song lyrics here..."
            rows={12}
            className="lyrics-textarea"
          />
          <button type="submit" className="btn btn-primary" disabled={!lyrics.trim()}>
            Generate Haiku
          </button>
        </form>
      )}

      {activeTab === 'search' && (
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a song or artist..."
              className="search-input"
            />
            <button type="submit" className="btn btn-primary" disabled={!searchQuery.trim() || isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'random' && (
        <form onSubmit={handleRandomArtist} className="random-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Enter an artist name..."
              className="search-input"
            />
            <button type="submit" className="btn btn-primary" disabled={!artistName.trim() || isLoadingRandom}>
              {isLoadingRandom ? 'Finding...' : 'Surprise Me'}
            </button>
          </div>
          <p className="hint">
            We'll pick a random song from this artist and create a haiku
          </p>
        </form>
      )}

      {activeTab === 'paste' && (
        <p className="hint">
          Tip: The generator works best with lyrics that have varied line lengths
        </p>
      )}
    </div>
  )
}
