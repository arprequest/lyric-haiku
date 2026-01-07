import { useState } from 'react'

export default function LyricsInput({ onSearch, onRandomArtist, isSearching, isLoadingRandom }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [artistName, setArtistName] = useState('')
  const [activeTab, setActiveTab] = useState('search') // 'search' or 'random'

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
    </div>
  )
}
