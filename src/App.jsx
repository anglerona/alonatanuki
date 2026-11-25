import { useLayoutEffect, useRef, useState } from 'react'
import gallery from './data/gallery.json'
import { links } from './links.js'
import Icon from './components/Icon.jsx'
import ArtImage from './components/ArtImage.jsx'
import Lightbox from './components/Lightbox.jsx'
import AnimatedPfp from './components/AnimatedPfp.jsx'
import BackToTop from './components/BackToTop.jsx'

const year = new Date().getFullYear()

const tabs = [
  { id: 'illustrations', label: 'illustrations', layout: 'masonry', items: gallery.illustrations },
  {
    id: 'stickers',
    label: 'stickers & charms',
    layout: 'stickers',
    items: [...gallery.chibis, ...gallery.pokemon],
  },
  { id: 'pfps', label: 'animated pfps', layout: 'videos', items: gallery.videos },
]

function Hero() {
  return (
    <section className="hero">
      <div className="avatar-wrap">
        <img
          className="avatar"
          src="/media/profile/profile-480.webp"
          alt="alonatanuki's profile picture"
          width="240"
          height="240"
          fetchPriority="high"
        />
        <Icon name="heart" size={26} className="spark s1" />
        <Icon name="heart" size={22} className="spark s2" />
        <Icon name="heart" size={18} className="spark s3" />
        <Icon name="heart" size={24} className="spark s4" />
        <Icon name="heart" size={16} className="spark s5" />
        <Icon name="heart" size={14} className="spark s6" />
        <Icon name="heart" size={22} className="spark s7" />
        <Icon name="heart" size={14} className="spark s8" />
        <Icon name="heart" size={18} className="spark s9" />
        <Icon name="heart" size={16} className="spark s10" />
      </div>
      <h1>alonatanuki</h1>
      <p className="tagline">digital illustrator in canada</p>
      <div className="link-pills">
        {links.map((l) => (
          <a key={l.id} href={l.href} target="_blank" rel="noopener noreferrer" className={`pill pill-${l.id}`}>
            <Icon name={l.id} size={20} />
            {l.label}
          </a>
        ))}
      </div>
    </section>
  )
}

function Gallery({ onOpen }) {
  const [tab, setTab] = useState(tabs[0].id)
  const current = tabs.find((t) => t.id === tab)
  const items = current.items

  // Slide the pink highlight under whichever tab is active.
  const barRef = useRef(null)
  const [indicator, setIndicator] = useState(null)
  useLayoutEffect(() => {
    const bar = barRef.current
    const place = () => {
      const el = bar.querySelector('.tab.is-active')
      setIndicator({ x: el.offsetLeft, width: el.offsetWidth })
    }
    place()
    // re-measure when the bar changes size (screen resize, font finishing loading)
    const ro = new ResizeObserver(place)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [tab])

  // If the bar is floating (scrolled down), jump back to the start of the
  // gallery so the new section is seen from its first piece.
  const switchTab = (id) => {
    const bar = barRef.current
    const stuck = bar.getBoundingClientRect().top <= parseFloat(getComputedStyle(bar).top) + 1
    setTab(id)
    if (stuck) {
      const section = bar.parentElement
      window.scrollTo({ top: section.offsetTop, behavior: 'smooth' })
    }
  }

  return (
    <section className="section" id="gallery">
      <div className="tabs" role="tablist" ref={barRef}>
        {indicator && (
          <span
            className="tab-indicator"
            aria-hidden="true"
            style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}
          />
        )}
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={`tab ${t.id === tab ? 'is-active' : ''}`}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
            <span className="tab-count">{t.items.length}</span>
          </button>
        ))}
      </div>

      {current.layout === 'videos' ? (
        <div className="pfp-row" key={tab}>
          {items.map((v, i) => (
            <AnimatedPfp key={v.slug} video={v} onOpen={() => onOpen(items, i)} />
          ))}
        </div>
      ) : current.layout === 'masonry' ? (
        <div className="masonry" key={tab}>
          {items.map((art, i) => (
            <button key={art.slug} className="card" onClick={() => onOpen(items, i)} aria-label={`Open ${art.title}`}>
              <ArtImage art={art} eager={i < 4} />
            </button>
          ))}
        </div>
      ) : (
        <div className="sticker-grid" key={tab}>
          {items.map((art, i) => (
            <button
              key={art.slug}
              className="sticker"
              style={{ '--tilt': `${((i * 37) % 7) - 3}deg` }}
              onClick={() => onOpen(items, i)}
              aria-label={`Open ${art.title}`}
            >
              <ArtImage art={art} fit="contain" eager={i < 8} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default function App() {
  const [lightbox, setLightbox] = useState(null)

  return (
    <>
      <main>
        <Hero />
        <Gallery onOpen={(items, index) => setLightbox({ items, index })} />
      </main>
      <footer className="footer">
        <Icon name="heart" size={16} />
        <span>© {year} alonatanuki</span>
        <span className="footer-sep" aria-hidden="true">·</span>
        <span>please don't repost without credit</span>
      </footer>
      <BackToTop />
      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onIndex={(index) => setLightbox((lb) => ({ ...lb, index }))}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}
