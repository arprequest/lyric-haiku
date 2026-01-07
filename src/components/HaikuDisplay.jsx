export default function HaikuDisplay({ result, onReset }) {
  if (!result) return null

  if (!result.success) {
    return (
      <div className="haiku-display haiku-error">
        <div className="error-content">
          <h3>Could not generate haiku</h3>
          <p>{result.error}</p>
          <p className="hint">Try different lyrics with more varied line lengths</p>
          <button onClick={onReset} className="btn btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="haiku-display haiku-success">
      <div className="haiku-content">
        {result.song && (
          <div className="song-credit">
            <p>From "{result.song.title}" by {result.song.artist}</p>
          </div>
        )}

        <div className="haiku-poem">
          {result.haiku.map((line, index) => (
            <p key={index} className="haiku-line" style={{ animationDelay: `${index * 0.2}s` }}>
              {line}
            </p>
          ))}
        </div>

        <div className="haiku-meta">
          <div className="syllable-breakdown">
            {result.lines.map((item, index) => (
              <span key={index} className="syllable-count">
                {item.syllables}
              </span>
            ))}
          </div>
        </div>

        <button onClick={onReset} className="btn btn-secondary">
          Create Another
        </button>
      </div>
    </div>
  )
}
