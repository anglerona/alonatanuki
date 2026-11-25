import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

export default function Lightbox({ items, index, onClose, onIndex }) {
  const art = items[index]
  const [readySrc, setReadySrc] = useState(null)
  const fullReady = readySrc === art.full
  const touchX = useRef(null)
  const dialogRef = useRef(null)

  const go = (d) => onIndex((index + d + items.length) % items.length)

  useEffect(() => {
    for (const d of [1, -1]) {
      const n = items[(index + d + items.length) % items.length]
      if (!n.full) continue
      const img = new Image()
      img.src = n.full
    }
  }, [index, items])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={art.title}
      tabIndex={-1}
      ref={dialogRef}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      <button className="lb-btn lb-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      <button className="lb-btn lb-prev" onClick={() => go(-1)} aria-label="Previous">
        <Icon name="left" />
      </button>

      <figure className={`lb-figure ${art.alpha ? 'is-sticker' : ''}`}>
        <div className="lb-frame" style={{ '--ar': art.width ? art.width / art.height : 1 }}>
          {art.src ? (
            <video key={art.src} src={art.src} poster={art.poster} className="lb-img lb-video" autoPlay muted loop playsInline aria-label={art.title} />
          ) : (
            <>
              <img key={art.thumb} src={art.thumb} alt="" className="lb-img lb-low" width={art.width} height={art.height} />
              <img
                key={art.full}
                src={art.full}
                alt={art.title}
                className={`lb-img lb-high ${fullReady ? 'is-ready' : ''}`}
                width={art.width}
                height={art.height}
                onLoad={() => setReadySrc(art.full)}
              />
            </>
          )}
        </div>
        <figcaption>
          {index + 1} / {items.length}
        </figcaption>
      </figure>

      <button className="lb-btn lb-next" onClick={() => go(1)} aria-label="Next">
        <Icon name="right" />
      </button>
    </div>
  )
}
