import { useState, useEffect, useCallback } from 'react'

export default function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [normalized, setNormalized] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e) => {
    // Raw position
    setPosition({ x: e.clientX, y: e.clientY })

    // Normalized position (-1 to 1) for parallax
    const normalizedX = (e.clientX / window.innerWidth) * 2 - 1
    const normalizedY = (e.clientY / window.innerHeight) * 2 - 1
    setNormalized({ x: normalizedX, y: normalizedY })
  }, [])

  useEffect(() => {
    // Check for touch device - disable mouse tracking
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    if (!isTouchDevice) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true })
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleMouseMove])

  return { position, normalized }
}
