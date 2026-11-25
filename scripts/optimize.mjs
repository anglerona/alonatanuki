import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, statSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import ffmpeg from 'ffmpeg-static'
import { profile, illustrations, chibis, pokemon, videos } from './catalog.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')
const dirs = {
  art: process.env.ART_DIR ?? path.join(os.homedir(), 'Downloads', 'Art', 'Art'),
  stickers:
    process.env.STICKER_DIR ?? path.join(os.homedir(), 'Downloads', 'alonatanuki', 'alonatanuki'),
}
const outRoot = path.join(root, 'public', 'media')

const THUMB = 640
const FULL = 1800
const VIDEO_W = 1200

const fresh = (out, src) => !force && existsSync(out) && statSync(out).mtimeMs > statSync(src).mtimeMs

// Subtle "@alonatanuki" in the bottom-right corner. Applied after shrinking to
// lightbox size so the text scales the same on every image.
async function addWatermark(img) {
  const buf = await img.resize({ width: FULL, height: FULL, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 0 }).toBuffer()
  const { width: w, height: h } = await sharp(buf).metadata()
  const size = Math.round(Math.min(w, h) * 0.035)
  const pad = Math.round(size * 0.9)
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="${w - pad}" y="${h - pad}" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-weight="600"
      font-size="${size}" fill="#ffffff" fill-opacity="0.55" stroke="#000000" stroke-opacity="0.12" stroke-width="${Math.max(1, size / 30)}">@alonatanuki</text>
  </svg>`
  return sharp(await sharp(buf).composite([{ input: Buffer.from(svg) }]).png({ compressionLevel: 0 }).toBuffer())
}

async function processImage(item, category) {
  const src = path.join(dirs[item.dir], item.file)
  const outDir = path.join(outRoot, category)
  mkdirSync(outDir, { recursive: true })
  const thumb = path.join(outDir, `${item.slug}-${THUMB}.webp`)
  const full = path.join(outDir, `${item.slug}-${FULL}.webp`)

  let img = sharp(src, { limitInputPixels: false })
  const hasAlpha = (await img.metadata()).hasAlpha && !(await img.stats()).isOpaque
  if (hasAlpha) {
    const trimmed = await img.trim().png({ compressionLevel: 0 }).toBuffer()
    const m = await sharp(trimmed).metadata()
    const pad = Math.round(Math.max(m.width, m.height) * 0.03)
    img = sharp(
      await sharp(trimmed)
        .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 0 })
        .toBuffer(),
    )
  }
  if (item.watermark) img = await addWatermark(img)
  const { width, height } = await img.metadata()

  if (!fresh(thumb, src)) {
    await img.clone().resize({ width: THUMB, withoutEnlargement: true }).webp({ quality: 78, effort: 6, alphaQuality: 80 }).toFile(thumb)
  }
  if (!fresh(full, src)) {
    await img.clone().resize({ width: FULL, height: FULL, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(full)
  }

  const blur = await img.clone().resize({ width: 16 }).webp({ quality: 40 }).toBuffer()

  const k = item.file
  const tSize = statSync(thumb).size
  const fSize = statSync(full).size
  console.log(`${category.padEnd(13)} ${k.padEnd(28)} thumb ${(tSize / 1024).toFixed(0)}KB  full ${(fSize / 1024).toFixed(0)}KB`)

  return {
    slug: item.slug,
    title: item.title,
    width,
    height,
    alpha: !!hasAlpha,
    thumb: `/media/${category}/${path.basename(thumb)}`,
    full: `/media/${category}/${path.basename(full)}`,
    blur: `data:image/webp;base64,${blur.toString('base64')}`,
  }
}

function dilate(mask, w, h, r) {
  const tmp = new Uint8Array(mask.length)
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = 0
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r) && !v; k++) v = mask[y * w + k]
      tmp[y * w + x] = v
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = 0
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r) && !v; k++) v = tmp[k * w + x]
      out[y * w + x] = v
    }
  return out
}

function recolorBlackBackground(frame, w, h, [R, G, B], outline = Math.round(w / 150)) {
  const n = w * h
  const drawing = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const lum = 0.299 * frame[i * 3] + 0.587 * frame[i * 3 + 1] + 0.114 * frame[i * 3 + 2]
    drawing[i] = lum > 40 ? 1 : 0
  }
  const near = dilate(drawing, w, h, outline)
  const bg = new Uint8Array(n)
  const seen = new Uint8Array(n)
  const stack = []
  const region = []
  for (let start = 0; start < n; start++) {
    if (near[start] || seen[start]) continue
    let touchesEdge = false
    region.length = 0
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()
      region.push(i)
      const x = i % w
      const y = (i / w) | 0
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesEdge = true
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && !near[j] && !seen[j]) {
          seen[j] = 1
          stack.push(j)
        }
      }
    }
    if (touchesEdge || region.length > n * 0.01) for (const i of region) bg[i] = 1
  }
  const edge = dilate(Uint8Array.from(bg, (v) => 1 - v), w, h, 1) // one-pixel soft edge
  for (let i = 0; i < n; i++) {
    if (!bg[i]) continue
    const a = edge[i] ? 0.5 : 1
    frame[i * 3] = frame[i * 3] * (1 - a) + R * a
    frame[i * 3 + 1] = frame[i * 3 + 1] * (1 - a) + G * a
    frame[i * 3 + 2] = frame[i * 3 + 2] * (1 - a) + B * a
  }
}

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

function processVideo(item) {
  const src = path.join(dirs[item.dir], item.file)
  const outDir = path.join(outRoot, 'animations')
  mkdirSync(outDir, { recursive: true })
  const mp4 = path.join(outDir, `${item.slug}.mp4`)
  const posterPng = path.join(outDir, `${item.slug}-poster.png`)
  const poster = path.join(outDir, `${item.slug}-poster.webp`)
  const encode = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]
  if (!fresh(mp4, src)) {
    if (item.background) {
      const info = spawnSync(ffmpeg, ['-hide_banner', '-i', src]).stderr.toString()
      const [, sw, sh] = /, (\d+)x(\d+)/.exec(info)
      const fps = /([\d.]+) fps/.exec(info)?.[1] ?? '14'
      const w = VIDEO_W
      const h = Math.round((w * sh) / sw / 2) * 2
      const raw = execFileSync(ffmpeg, ['-loglevel', 'error', '-i', src, '-vf', `scale=${VIDEO_W}:-2:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 })
      const size = w * h * 3
      if (raw.length % size) throw new Error(`unexpected frame size for ${item.file}`)
      const rgb = hexToRgb(item.background)
      for (let off = 0; off < raw.length; off += size) recolorBlackBackground(raw.subarray(off, off + size), w, h, rgb)
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-r', fps, '-i', '-', ...encode], { input: raw, maxBuffer: 1 << 30 })
    } else {
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-vf', `scale=${VIDEO_W}:-2:flags=lanczos`, ...encode])
    }
  }
  return { mp4, posterPng, poster, item, src }
}

async function main() {
  const gallery = { illustrations: [], chibis: [], pokemon: [], videos: [] }

  for (const it of illustrations) gallery.illustrations.push(await processImage(it, 'illustrations'))
  for (const it of chibis) gallery.chibis.push(await processImage(it, 'chibis'))
  for (const it of pokemon) gallery.pokemon.push(await processImage(it, 'pokemon'))

  for (const it of videos) {
    const { mp4, posterPng, poster, src } = processVideo(it)
    if (!fresh(poster, src)) {
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', mp4, '-frames:v', '1', posterPng])
      await sharp(posterPng).webp({ quality: 70 }).toFile(poster)
      rmSync(posterPng)
    }
    console.log(`animation     ${it.file.padEnd(28)} mp4 ${(statSync(mp4).size / 1024).toFixed(0)}KB`)
    gallery.videos.push({
      slug: it.slug,
      title: it.title,
      src: `/media/animations/${path.basename(mp4)}`,
      poster: `/media/animations/${path.basename(poster)}`,
    })
  }

  const pSrc = path.join(dirs[profile.dir], profile.file)
  const avatarDir = path.join(outRoot, 'profile')
  mkdirSync(avatarDir, { recursive: true })
  for (const size of [160, 480]) {
    const out = path.join(avatarDir, `profile-${size}.webp`)
    if (!fresh(out, pSrc)) await sharp(pSrc).resize(size, size).webp({ quality: 82 }).toFile(out)
  }
  const fav = path.join(root, 'public', 'favicon.png')
  if (!fresh(fav, pSrc)) {
    const mask = Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="32"/></svg>')
    await sharp(pSrc).resize(64, 64).composite([{ input: mask, blend: 'dest-in' }]).png().toFile(fav)
  }

  writeFileSync(path.join(root, 'src', 'data', 'gallery.json'), JSON.stringify(gallery, null, 2))
  console.log('\nwrote src/data/gallery.json')
}

mkdirSync(path.join(root, 'src', 'data'), { recursive: true })
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
