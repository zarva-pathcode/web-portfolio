const sharp = require('sharp');
const fs = require('fs');

const SRC = 'D:/Zarva/project/web/portfolio/src/assets/profile-pic.png';
const COLS = 100;
const ROWS = 58;
const CHARS = ' .:-=+*#%@';

(async () => {
  // Head-focused crop, then downscale to the character grid.
  const meta = await sharp(SRC).metadata();
  const cropW = Math.min(meta.width, Math.round(meta.width * 0.86));
  const cropH = Math.min(meta.height, Math.round(meta.height * 0.92));
  const left = Math.round((meta.width - cropW) / 2);
  const top = Math.max(0, Math.round(meta.height * 0.02));

  const { data } = await sharp(SRC)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(COLS, ROWS, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rows = [];
  for (let y = 0; y < ROWS; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const v = data[y * COLS + x] / 255;
      const idx = Math.min(CHARS.length - 1, Math.max(0, Math.round((1 - v) * (CHARS.length - 1))));
      line += CHARS[idx];
    }
    rows.push(line);
  }

  const FS = 8;
  const CW = FS * 0.6;
  const CH = FS * 1.02;
  const W = Math.ceil(COLS * CW);
  const H = Math.ceil(ROWS * CH);

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = rows
    .map((line, i) => `<text x="0" y="${((i + 1) * CH).toFixed(2)}" xml:space="preserve">${esc(line)}</text>`)
    .join('');

  const svg = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#F3EFE6"/>
<g font-family="Courier New, Courier, monospace" font-size="${FS}" fill="${fill}" letter-spacing="0">${body}</g>
</svg>`;

  fs.writeFileSync('D:/Zarva/project/web/portfolio/design/ascii-clay.svg', svg('#B4552F'));
  fs.writeFileSync('D:/Zarva/project/web/portfolio/design/ascii-ink.svg', svg('#14110F'));

  await sharp(Buffer.from(svg('#B4552F'))).png().toFile('D:/Zarva/project/web/portfolio/design/ascii-clay.png');
  await sharp(Buffer.from(svg('#14110F'))).png().toFile('D:/Zarva/project/web/portfolio/design/ascii-ink.png');
  console.log('ok', W, H);
})();
