const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/src/assets/profile-pic.png';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const W = 760;
const H = 880;
const COLS = 64;
const ROWS = 78;
const CROP = { left: 186, top: 150, width: 236, height: 300 };
const BG = 0.74; // luminance above this is background
const FADE_TOP = 0.04; // fraction of height
const FADE_BOTTOM = 0.16;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

(async () => {
  const { data } = await sharp(SRC)
    .extract(CROP)
    .grayscale()
    .resize(COLS, ROWS, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cw = W / COLS;
  const ch = H / ROWS;
  const maxR = Math.min(cw, ch) * 0.55;
  const circles = [];

  for (let y = 0; y < ROWS; y++) {
    const fy = (y + 0.5) / ROWS;
    const edge =
      smoothstep(FADE_TOP, FADE_TOP + 0.08, fy) * (1 - smoothstep(1 - FADE_BOTTOM, 1, fy));

    for (let x = 0; x < COLS; x++) {
      const v = data[y * COLS + x] / 255;
      if (v >= BG) continue;

      // Contrast curve: keeps facial mid-tones, drops the flat shirt.
      const t = Math.pow((BG - v) / BG, 0.92);
      const r = maxR * (0.1 + 0.9 * t) * (0.65 + 0.35 * edge);
      if (r < 0.35) continue;

      const cx = (x + 0.5) * cw;
      const cy = (y + 0.5) * ch;
      circles.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill-opacity="${(0.25 + 0.75 * edge).toFixed(2)}"/>`
      );
    }
  }

  const svg = (fill) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="${fill}">${circles.join('')}</g></svg>`;

  await sharp(Buffer.from(svg('#B4552F'))).png().toFile(`${OUT}/halftone-portrait-clay.png`);
  await sharp(Buffer.from(svg('#14110F'))).png().toFile(`${OUT}/halftone-portrait-ink.png`);
  console.log('ok', circles.length, 'dots');
})();
