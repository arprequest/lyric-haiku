export default function SearchResults({ results, onSelectSong, isLoading, isLoadingLyrics, selectedSong }) {
  if (isLoading) {
    return (
      <div className="search-results loading">
        <div className="loader"></div>
        <p>Searching songs...</p>
      </div>
    )
  }

  if (isLoadingLyrics && selectedSong) {
    return (
      <div className="search-results loading">
        <div className="loader"></div>
        <p>Fetching lyrics for "{selectedSong.title}"...</p>
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
        Click a song to generate a haiku from its lyrics
      </p>
    </div>
  )
}
