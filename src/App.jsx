import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import LyricsInput from './components/LyricsInput'
import HaikuDisplay from './components/HaikuDisplay'
import HaikuBubbles from './components/HaikuBubbles'
import SearchResults from './components/SearchResults'
import { generateHaiku, generateClosestHaiku } from './utils/haikuGenerator'

export default function App() {
  const [haikuResult, setHaikuResult] = useState(null)
  const [communityHaikus, setCommunityHaikus] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false)
  const [isLoadingRandom, setIsLoadingRandom] = useState(false)
  const [selectedSong, setSelectedSong] = useState(null)
  const [view, setView] = useState('input') // 'input' or 'result'

  // Fetch community haikus on mount
  useEffect(() => {
    const fetchCommunityHaikus = async () => {
      try {
        const response = await fetch('/api/haikus')
        if (response.ok) {
          const data = await response.json()
          setCommunityHaikus(data.haikus || [])
        }
      } catch (error) {
        console.error('Failed to fetch community haikus:', error)
      }
    }
    fetchCommunityHaikus()
  }, [])

  // Save haiku to database and update local state
  const saveHaikuToCommunity = async (result) => {
    if (!result.success) return

    const haikuData = {
      id: crypto.randomUUID(),
      haiku: result.haiku,
      song: result.song,
      isExact: result.isExact
    }

    // Add to local state immediately
    setCommunityHaikus(prev => [
      { ...haikuData, createdAt: Date.now() },
      ...prev
    ].slice(0, 20))

    // Save to database
    try {
      await fetch('/api/haikus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(haikuData)
      })
    } catch (error) {
      console.error('Failed to save haiku:', error)
    }
  }

  // Handle bubble click - show that haiku
  const handleSelectFromHistory = (historyItem) => {
    setHaikuResult({
      haiku: historyItem.haiku,
      song: historyItem.song,
      isExact: historyItem.isExact,
      lines: historyItem.haiku.map((line, i) => ({
        original: line,
        syllables: [5, 7, 5][i]
      })),
      success: true
    })
    setView('result')
  }

  // GSAP refs
  const titleRef = useRef(null)
  const taglineRef = useRef(null)
  const inputRef = useRef(null)

  // GSAP entrance animations
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const ctx = gsap.context(() => {
      // Initial state
      gsap.set([titleRef.current, taglineRef.current, inputRef.current], {
        opacity: 0,
        y: 30
      })

      // Animate in sequence
      const tl = gsap.timeline({ delay: 0.2 })

      tl.to(titleRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out'
      })
      .to(taglineRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out'
      }, '-=0.4')
      .to(inputRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out'
      }, '-=0.3')
    })

    return () => ctx.revert()
  }, [])

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
      alert('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSong = async (song) => {
    setIsLoadingLyrics(true)
    setSelectedSong(song)

    try {
      const response = await fetch(`/api/lyrics?url=${encodeURIComponent(song.url)}`)

      if (!response.ok) throw new Error('Failed to fetch lyrics')

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Try exact haiku first
      let result = generateHaiku(data.lyrics)

      // If no exact match, use closest match
      if (!result.success) {
        result = generateClosestHaiku(data.lyrics)
      }

      const fullResult = { ...result, song }
      setHaikuResult(fullResult)
      saveHaikuToCommunity(fullResult)
      setView('result')
    } catch (error) {
      console.error('Lyrics error:', error)
      alert('Could not fetch lyrics. Opening Genius page instead.')
      window.open(song.url, '_blank')
    } finally {
      setIsLoadingLyrics(false)
    }
  }

  const handleRandomArtist = async (artistName) => {
    setIsLoadingRandom(true)

    try {
      // Search for songs by the artist
      const searchResponse = await fetch(`/api/search?q=${encodeURIComponent(artistName)}`)

      if (!searchResponse.ok) throw new Error('Search failed')

      const searchData = await searchResponse.json()
      const songs = searchData.songs || []

      // Filter songs that match the artist name (case insensitive)
      const artistSongs = songs.filter(song =>
        song.artist.toLowerCase().includes(artistName.toLowerCase())
      )

      if (artistSongs.length === 0) {
        alert(`No songs found for "${artistName}". Try a different artist.`)
        return
      }

      // Shuffle the songs array for random selection
      const shuffledSongs = [...artistSongs].sort(() => Math.random() - 0.5)

      const maxAttempts = Math.min(10, shuffledSongs.length)
      let lastResult = null
      let lastSong = null

      // Try up to maxAttempts songs looking for exact 5-7-5
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const randomSong = shuffledSongs[attempt]
        lastSong = randomSong
        setSelectedSong(randomSong)

        try {
          const lyricsResponse = await fetch(`/api/lyrics?url=${encodeURIComponent(randomSong.url)}`)

          if (!lyricsResponse.ok) continue

          const lyricsData = await lyricsResponse.json()

          if (lyricsData.error) continue

          // Try exact haiku
          const result = generateHaiku(lyricsData.lyrics)

          if (result.success && result.isExact) {
            // Found exact 5-7-5 haiku
            const fullResult = { ...result, song: randomSong }
            setHaikuResult(fullResult)
            saveHaikuToCommunity(fullResult)
            setView('result')
            return
          }

          // Store closest match as fallback
          if (!lastResult) {
            lastResult = generateClosestHaiku(lyricsData.lyrics)
            if (lastResult.success) {
              lastResult.song = randomSong
            }
          }
        } catch {
          // Continue to next song if this one fails
          continue
        }
      }

      // No exact match found after all attempts, use closest match
      if (lastResult && lastResult.success) {
        setHaikuResult(lastResult)
        saveHaikuToCommunity(lastResult)
        setView('result')
      } else {
        alert('Could not generate a haiku from this artist\'s songs. Try a different artist.')
      }
    } catch (error) {
      console.error('Random artist error:', error)
      alert('Could not find a song. Please try again or use a different artist.')
    } finally {
      setIsLoadingRandom(false)
    }
  }

  const handleReset = () => {
    setHaikuResult(null)
    setSearchResults([])
    setSelectedSong(null)
    setView('input')
  }

  return (
    <div className="app">
      <HaikuBubbles history={communityHaikus} onSelectHaiku={handleSelectFromHistory} />

      <header className="header">
        <h1 className="logo" onClick={handleReset} style={{ cursor: 'pointer' }}>
          <span className="logo-accent">Lyric</span> Haiku
        </h1>
        <p className="tagline">Transform songs into poetry</p>
      </header>

      <main className="main">
        {view === 'input' ? (
          <div className="input-section">
            <div className="hero-text">
              <h2 ref={titleRef}>
                Create haiku from<br /><span className="highlight">your favorite lyrics</span>
              </h2>
              <p ref={taglineRef}>
                Search for a song and we'll find lines with the perfect 5-7-5 syllable pattern
              </p>
            </div>

            <div ref={inputRef}>
              <LyricsInput
                onSearch={handleSearch}
                onRandomArtist={handleRandomArtist}
                isSearching={isSearching}
                isLoadingRandom={isLoadingRandom}
              />

              <SearchResults
                results={searchResults}
                onSelectSong={handleSelectSong}
                isLoading={isSearching}
                isLoadingLyrics={isLoadingLyrics}
                selectedSong={selectedSong}
              />
            </div>
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
