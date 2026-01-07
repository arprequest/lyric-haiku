import { useRef, useEffect, useCallback } from 'react'

export default function HeroCanvas({ mousePosition }) {
  const canvasRef = useRef(null)
  const trailsRef = useRef([])
  const animationRef = useRef(null)

  // Add new trail point
  const addTrail = useCallback((x, y) => {
    trailsRef.current.push({
      x,
      y,
      radius: 80,
      alpha: 0.15,
      birth: Date.now()
    })

    // Limit trail length for performance
    if (trailsRef.current.length > 30) {
      trailsRef.current.shift()
    }
  }, [])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const now = Date.now()

    // Clear canvas with slight fade for smoother trails
    ctx.fillStyle = 'rgba(10, 10, 10, 0.1)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw and update trails
    trailsRef.current = trailsRef.current.filter(trail => {
      const age = now - trail.birth
      const lifespan = 1000 // 1 second lifespan

      if (age > lifespan) return false

      // Calculate fade based on age
      const progress = age / lifespan
      const alpha = trail.alpha * (1 - progress)
      const radius = trail.radius * (1 - progress * 0.3)

      // Draw glow
      const gradient = ctx.createRadialGradient(
        trail.x, trail.y, 0,
        trail.x, trail.y, radius
      )
      gradient.addColorStop(0, `rgba(200, 255, 0, ${alpha})`)
      gradient.addColorStop(0.5, `rgba(200, 255, 0, ${alpha * 0.3})`)
      gradient.addColorStop(1, 'rgba(200, 255, 0, 0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(trail.x, trail.y, radius, 0, Math.PI * 2)
      ctx.fill()

      return true
    })

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Start animation loop
  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  // Track mouse position
  useEffect(() => {
    if (mousePosition.x !== 0 || mousePosition.y !== 0) {
      addTrail(mousePosition.x, mousePosition.y)
    }
  }, [mousePosition.x, mousePosition.y, addTrail])

  return (
    <canvas
      ref={canvasRef}
      className="hero-canvas"
      aria-hidden="true"
    />
  )
}
