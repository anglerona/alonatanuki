# alonatanuki art site

A small React + Vite portfolio for alonatanuki's illustrations, stickers, charms and animated profile pictures.

## Run it

```
npm install
npm run dev
```

## Add or rename art

1. Put the original files in `Downloads/Art/Art` (illustrations, chibis, videos, `Profile.png`) or `Downloads/alonatanuki/alonatanuki` (Pokémon charms). You can point to other folders with the `ART_DIR` and `STICKER_DIR` env vars.
2. Add the file, a slug and a title to `scripts/catalog.mjs`. The order there is the order on the site.
3. Run `npm run optimize`. This writes small WebP images and compressed MP4s to `public/media/` and updates `src/data/gallery.json`. Add `-- --force` to rebuild everything.

Links to Instagram, Etsy and ACGGoods live in `src/links.js`.
