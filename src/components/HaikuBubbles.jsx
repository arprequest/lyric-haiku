import { useMemo } from 'react'

export default function HaikuBubbles({ history, onSelectHaiku }) {
  // Generate random positions for each bubble
  const bubbleStyles = useMemo(() => {
    return history.slice(0, 8).map((_, index) => {
      // Distribute bubbles across the viewport
      const positions = [
        { top: '10%', left: '5%' },
        { top: '15%', right: '8%' },
        { top: '35%', left: '3%' },
        { top: '45%', right: '5%' },
        { top: '60%', left: '7%' },
        { top: '55%', right: '10%' },
        { top: '75%', left: '4%' },
        { top: '70%', right: '6%' },
      ]

      const pos = positions[index] || positions[0]
      const duration = 25 + Math.random() * 15 // 25-40s
      const delay = index * 2 // Stagger by 2s each

      return {
        ...pos,
        '--float-duration': `${duration}s`,
        '--float-delay': `${delay}s`,
      }
    })
  }, [history.length])

  if (history.length === 0) return null

  return (
    <div className="haiku-bubbles">
      {history.slice(0, 8).map((item, index) => (
        <div
          key={item.id}
          className="haiku-bubble"
          style={bubbleStyles[index]}
          onClick={() => onSelectHaiku(item)}
        >
          <div className="bubble-lines">
            {item.haiku.map((line, lineIndex) => (
              <p key={lineIndex}>{line}</p>
            ))}
          </div>
          {item.song && (
            <div className="bubble-credit">
              {item.song.title} - {item.song.artist}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
