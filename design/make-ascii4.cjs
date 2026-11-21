const sharp = require('sharp');

const FONT = 'D:/Zarva/project/REA/web/.fonts/GeistMono-5.ttf';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const SRC = 'D:/Zarva/project/web/portfolio/src/assets/bg-image.jpg';
const CROP = { left: 560, top: 0, width: 640, height: 740 };
const COLS = 90;
const ROWS = 66;
const CHARS = ' .:-=+*#%@';
const W = 760;
const H = 880;

(async () => {
  const { data } = await sharp(SRC)
    .extract(CROP)
    .grayscale()
    .blur(1.4)
    .resize(COLS, ROWS, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const at = (x, y) => data[Math.min(ROWS - 1, Math.max(0, y)) * COLS + Math.min(COLS - 1, Math.max(0, x))];
  const mag = new Float32Array(COLS * ROWS);
  let max = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const gx =
        -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) +
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy =
        -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[y * COLS + x] = m;
      if (m > max) max = m;
    }
  }

  const rows = [];
  const floor = max * 0.06;
  for (let y = 0; y < ROWS; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const m = mag[y * COLS + x];
      if (m <= floor) { line += ' '; continue; }
      const t = Math.min(1, (m - floor) / (max - floor));
      const idx = Math.min(CHARS.length - 1, Math.max(1, Math.round(Math.pow(t, 0.8) * (CHARS.length - 1))));
      line += CHARS[idx];
    }
    rows.push(line);
  }

  const escaped = rows.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  for (const [suffix, color] of [['clay', '#B4552F'], ['ink', '#14110F']]) {
    const textBuf = await sharp({
      text: {
        text: `<span font="12" foreground="${color}">${escaped}</span>`,
        fontfile: FONT,
        rgba: true,
        dpi: 96,
      },
    }).png().toBuffer();

    const art = await sharp(textBuf).resize(W, H, { fit: 'fill' }).png().toBuffer();
    await sharp({ create: { width: W, height: H, channels: 4, background: '#F3EFE6' } })
      .composite([{ input: art, top: 0, left: 0 }])
      .png()
      .toFile(`${OUT}/ascii-cinematic-${suffix}.png`);
    console.log('ok', suffix, 'max', max.toFixed(0));
  }
})();
