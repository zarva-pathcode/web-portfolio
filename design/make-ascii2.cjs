const sharp = require('sharp');
const fs = require('fs');

const SRC = 'D:/Zarva/project/web/portfolio/src/assets/profile-pic.png';
const FONT = 'D:/Zarva/project/REA/web/.fonts/GeistMono-5.ttf';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const COLS = 72;
const ROWS = 62;
const CHARS = ' .:-=+*#%@';
const W = 760;
const H = 880;
const BG_CUT = 0.72; // luminance above this is background → blank

async function asciiRows() {
  const { data } = await sharp(SRC)
    .extract({ left: 205, top: 150, width: 212, height: 286 })
    .resize(COLS, ROWS, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rows = [];
  for (let y = 0; y < ROWS; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const v = data[y * COLS + x] / 255;
      if (v >= BG_CUT) { line += ' '; continue; }
      const t = Math.pow(Math.min(1, Math.max(0, (BG_CUT - v) / BG_CUT)), 1.25);
      const idx = Math.min(CHARS.length - 1, Math.max(1, Math.round(t * (CHARS.length - 1))));
      line += CHARS[idx];
    }
    rows.push(line);
  }
  return rows;
}

(async () => {
  const rows = await asciiRows();
  const escaped = rows.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  for (const [name, color] of [
    ['ascii-portrait-clay', '#B4552F'],
    ['ascii-portrait-ink', '#14110F'],
  ]) {
    const textBuf = await sharp({
      text: {
        text: `<span font="12" foreground="${color}">${escaped}</span>`,
        fontfile: FONT,
        rgba: true,
        dpi: 96,
      },
    })
      .png()
      .toBuffer();

    const art = await sharp(textBuf)
      .resize(W, H, { fit: 'fill' })
      .png()
      .toBuffer();

    const card = await sharp({
      create: { width: W, height: H, channels: 4, background: '#F3EFE6' },
    })
      .composite([{ input: art, top: 0, left: 0 }])
      .png()
      .toFile(`${OUT}/${name}.png`);

    console.log(name, card.width, card.height);
  }
})();
