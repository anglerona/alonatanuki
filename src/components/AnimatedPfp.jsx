import { useEffect, useRef } from 'react'

export default function AnimatedPfp({ video, onOpen }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { rootMargin: '100px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <button className="pfp" onClick={onOpen} aria-label={`Open ${video.title}`}>
      <div className="pfp-bubble">
        <video
          ref={ref}
          src={video.src}
          poster={video.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={video.title}
        />
      </div>
    </button>
  )
}
