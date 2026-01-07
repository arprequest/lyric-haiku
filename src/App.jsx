import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import LyricsInput from './components/LyricsInput'
import HaikuDisplay from './components/HaikuDisplay'
import SearchResults from './components/SearchResults'
import HeroCanvas from './components/HeroCanvas'
import useMousePosition from './hooks/useMousePosition'
import { generateHaiku } from './utils/haikuGenerator'

export default function App() {
  const [haikuResult, setHaikuResult] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false)
  const [isLoadingRandom, setIsLoadingRandom] = useState(false)
  const [selectedSong, setSelectedSong] = useState(null)
  const [view, setView] = useState('input') // 'input' or 'result'

  // Interactive effects
  const { position, normalized } = useMousePosition()
  const heroRef = useRef(null)
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

  // Parallax transform styles
  const titleParallax = {
    transform: `translate(${normalized.x * -10}px, ${normalized.y * -10}px)`
  }
  const taglineParallax = {
    transform: `translate(${normalized.x * 5}px, ${normalized.y * 5}px)`
  }

  const handleLyricsSubmit = (lyrics) => {
    const result = generateHaiku(lyrics)
    setHaikuResult(result)
    setSelectedSong(null)
    setView('result')
  }

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
      alert('Search failed. Please try again or paste lyrics directly.')
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

      const result = generateHaiku(data.lyrics)
      setHaikuResult({ ...result, song })
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

      // Pick a random song
      const randomSong = artistSongs[Math.floor(Math.random() * artistSongs.length)]
      setSelectedSong(randomSong)

      // Fetch lyrics for the random song
      const lyricsResponse = await fetch(`/api/lyrics?url=${encodeURIComponent(randomSong.url)}`)

      if (!lyricsResponse.ok) throw new Error('Failed to fetch lyrics')

      const lyricsData = await lyricsResponse.json()

      if (lyricsData.error) {
        throw new Error(lyricsData.error)
      }

      const result = generateHaiku(lyricsData.lyrics)
      setHaikuResult({ ...result, song: randomSong })
      setView('result')
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
      <header className="header">
        <h1 className="logo" onClick={handleReset} style={{ cursor: 'pointer' }}>
          <span className="logo-accent">Lyric</span> Haiku
        </h1>
        <p className="tagline">Transform songs into poetry</p>
      </header>

      <main className="main">
        {view === 'input' ? (
          <div className="input-section" ref={heroRef}>
            <HeroCanvas mousePosition={position} />

            <div className="hero-text">
              <h2 ref={titleRef} style={titleParallax}>
                Create haiku from<br /><span className="highlight">your favorite lyrics</span>
              </h2>
              <p ref={taglineRef} style={taglineParallax}>
                Paste song lyrics and we'll find lines with the perfect 5-7-5 syllable pattern
              </p>
            </div>

            <div ref={inputRef}>
              <LyricsInput
                onLyricsSubmit={handleLyricsSubmit}
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
