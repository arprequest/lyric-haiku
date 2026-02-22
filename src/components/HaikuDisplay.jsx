import { useState } from 'react'

export default function HaikuDisplay({ result, onReset }) {
  const permalink = result?.id ? `https://lyric-haiku.com/haiku/${result.id}` : 'https://lyric-haiku.com'
  const [copied, setCopied] = useState(false)

  if (!result) return null

  if (!result.success) {
    return (
      <div className="haiku-display haiku-error">
        <div className="error-content">
          <h3>Could not generate haiku</h3>
          <p>{result.error || 'No suitable lines found in these lyrics'}</p>
          <p className="hint">Try a different song with more varied line lengths</p>
          <button onClick={onReset} className="btn btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const getShareText = () => {
    const lines = result.haiku.join('\n')
    const credit = result.song
      ? `\n\n- From "${result.song.title}" by ${result.song.artist}`
      : ''
    return `${lines}${credit}\n\n${permalink}`
  }

  const handleTwitterShare = () => {
    const text = encodeURIComponent(getShareText())
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const handleFacebookShare = () => {
    const url = encodeURIComponent(permalink)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  }

  const handleCopyForTikTok = async () => {
    try {
      await navigator.clipboard.writeText(getShareText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="haiku-display haiku-success">
      <div className="haiku-content">
        {result.song && (
          <div className="song-credit">
            <p>From "{result.song.title}" by {result.song.artist}</p>
          </div>
        )}

        {!result.isExact && (
          <div className="approximate-note">
            Closest match to 5-7-5
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
              <span
                key={index}
                className={`syllable-count ${!result.isExact && item.syllables !== [5, 7, 5][index] ? 'syllable-off' : ''}`}
              >
                {item.syllables}
              </span>
            ))}
          </div>
        </div>

        <div className="haiku-actions">
          <button onClick={onReset} className="btn btn-secondary">
            Create Another
          </button>
        </div>

        {result.song && (
          <div className="listen-section">
            <a
              href={`https://open.spotify.com/search/${encodeURIComponent(`${result.song.title} ${result.song.artist}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="listen-btn listen-spotify"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              Listen on Spotify
            </a>
            <a
              href={`https://music.apple.com/search?term=${encodeURIComponent(`${result.song.title} ${result.song.artist}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="listen-btn listen-apple"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.454.025C4.948.208 4.432.12 3.947.3c-1.17.48-1.994 1.32-2.467 2.5-.22.56-.335 1.14-.367 1.74-.007.15-.012.302-.013.453v11.501c.01.15.017.302.025.453.056.857.235 1.67.59 2.44.633 1.34 1.664 2.24 3.066 2.73.55.19 1.12.285 1.705.3.16.005.32.01.48.01h11.502c.16 0 .32-.005.48-.01.585-.015 1.155-.11 1.705-.3 1.402-.49 2.433-1.39 3.066-2.73.355-.77.534-1.583.59-2.44.008-.15.015-.302.025-.453V6.577c-.003-.15-.008-.302-.013-.453z"/></svg>
              Listen on Apple Music
            </a>
          </div>
        )}

        <div className="share-section">
          <p className="share-label">Share your haiku</p>
          <div className="share-buttons">
            <button onClick={handleTwitterShare} className="share-btn share-twitter" aria-label="Share on Twitter">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            <button onClick={handleFacebookShare} className="share-btn share-facebook" aria-label="Share on Facebook">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button onClick={handleCopyForTikTok} className="share-btn share-tiktok" aria-label="Copy for TikTok">
              {copied ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              )}
            </button>
          </div>
          {copied && <p className="copied-feedback">Copied to clipboard!</p>}
        </div>
      </div>
    </div>
  )
}
