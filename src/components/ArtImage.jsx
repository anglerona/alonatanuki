import { useState } from 'react'

export default function ArtImage({ art, eager = false, className = '', fit = 'cover' }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className={`art-img ${loaded ? 'is-loaded' : ''} ${className}`}
      style={{
        aspectRatio: fit === 'cover' ? `${art.width} / ${art.height}` : undefined,
        backgroundImage: art.alpha ? undefined : `url(${art.blur})`,
      }}
    >
      <img
        src={art.thumb}
        alt={art.title}
        width={art.width}
        height={art.height}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        onLoad={() => setLoaded(true)}
        ref={(el) => {
          if (el?.complete && el.naturalWidth) setLoaded(true)
        }}
        style={{ objectFit: fit }}
      />
    </div>
  )
}
