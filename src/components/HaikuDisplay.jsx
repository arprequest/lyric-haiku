import { useState } from 'react'

export default function HaikuDisplay({ result, onReset }) {
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
    return `${lines}${credit}\n\nCreate your own: haiku.arprequest.com`
  }

  const handleTwitterShare = () => {
    const text = encodeURIComponent(getShareText())
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const handleFacebookShare = () => {
    const url = encodeURIComponent('https://haiku.arprequest.com')
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
