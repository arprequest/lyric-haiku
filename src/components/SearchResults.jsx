export default function SearchResults({ results, onSelectSong, isLoading }) {
  if (isLoading) {
    return (
      <div className="search-results loading">
        <div className="loader"></div>
        <p>Searching songs...</p>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return null
  }

  return (
    <div className="search-results">
      <h3>Search Results</h3>
      <div className="results-list">
        {results.map((song) => (
          <div key={song.id} className="song-result" onClick={() => onSelectSong(song)}>
            <div className="song-thumbnail">
              {song.thumbnail ? (
                <img src={song.thumbnail} alt={song.title} />
              ) : (
                <div className="placeholder-thumb"></div>
              )}
            </div>
            <div className="song-info">
              <h4 className="song-title">{song.title}</h4>
              <p className="song-artist">{song.artist}</p>
            </div>
            <div className="song-action">
              <span className="select-icon">→</span>
            </div>
          </div>
        ))}
      </div>
      <p className="hint">
        Click a song to view lyrics on Genius, then copy and paste them
      </p>
    </div>
  )
}
