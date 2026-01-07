import { useState } from 'react'

export default function LyricsInput({ onLyricsSubmit, onSearch, isSearching }) {
  const [lyrics, setLyrics] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('paste') // 'paste' or 'search'

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
      </div>

      {activeTab === 'paste' ? (
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
      ) : (
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

      {activeTab === 'paste' && (
        <p className="hint">
          Tip: The generator works best with lyrics that have varied line lengths
        </p>
      )}
    </div>
  )
}
