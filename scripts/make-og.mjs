// Generates the static OG image (public/og.png) at 1200x630.
// Run with: node scripts/make-og.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const W = 1200;
const H = 630;
const OUT = 'public/og.png';
const PORTRAIT = 'src/assets/bg-image.png';

mkdirSync('public', { recursive: true });

// The OG card typesets in a grotesque available at build time.
// grotesque that is present on virtually every system. It is the same geometric
// idea as Space Grotesk, and the card is only ever seen at thumbnail size.
const SANS = 'Inter Variable, Segoe UI, Arial, Helvetica, sans-serif';

const text = (x, y, size, weight, value, fill, extra = '') => `
  <text x="${x}" y="${y}" font-family="${SANS}" font-size="${size}"
        font-weight="${weight}" fill="${fill}" ${extra}>${value}</text>`;

const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.98"/>
      <stop offset="50%"  stop-color="#000000" stop-opacity="0.93"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="28%" r="52%">
      <stop offset="0%"   stop-color="#f5f5f7" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#f5f5f7" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#000000"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>

  ${text(72, 118, 20, 600, 'MOBILE &amp; FRONTEND DEVELOPER', '#f5f5f7', 'letter-spacing="0.18em"')}
  ${text(72, 214, 74, 700, 'Bintang Fadilah', '#f8fafc', 'letter-spacing="-0.03em"')}
  ${text(72, 296, 74, 700, 'Ramadhan', '#f8fafc', 'letter-spacing="-0.03em"')}
  ${text(72, 356, 30, 500, 'Flutter &#183; React &#183; TypeScript &#183; UI/UX', '#94a3b8')}

  <rect x="72" y="404" width="86" height="3" rx="1.5" fill="#f5f5f7"/>

  ${text(72, 470, 38, 700, 'ZARVAISM.', '#86868b', 'letter-spacing="-0.03em"')}
  ${text(72, 510, 19, 400, 'bintangfara363@gmail.com', '#94a3b8')}
</svg>
`);

const portrait = await sharp(PORTRAIT)
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .modulate({ brightness: 0.94, saturation: 0.9 })
  // The source backdrop has a dithered blue gradient that bands once scaled.
  // A heavy blur costs nothing here because the whole portrait sits behind a
  // scrim â€” only the silhouette needs to read.
  .blur(6)
  .toBuffer();

await sharp(portrait)
  .composite([{ input: overlay, top: 0, left: 0 }])
  .png({ quality: 90, compressionLevel: 9 })
  .toFile(OUT);

console.log(`Wrote ${OUT} (${W}x${H})`);

