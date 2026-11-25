import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

// Appears once the visitor has scrolled to the bottom of the page and jumps
// back to the top.
export default function BackToTop() {
  const [atBottom, setAtBottom] = useState(false)

  useEffect(() => {
    const check = () => {
      const doc = document.documentElement
      setAtBottom(window.scrollY > 400 && window.scrollY + window.innerHeight >= doc.scrollHeight - 160)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    // lazy images change the page height, so re-check when it grows
    const ro = new ResizeObserver(check)
    ro.observe(document.body)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])

  return (
    <button
      className={`back-to-top ${atBottom ? 'is-visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      tabIndex={atBottom ? 0 : -1}
    >
      <Icon name="up" size={26} />
    </button>
  )
}
