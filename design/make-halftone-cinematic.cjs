const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/src/assets/bg-image.jpg';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const W = 760;
const H = 880;
const COLS = 64;
const ROWS = 78;
const CROP = { left: 545, top: 0, width: 620, height: 718 };
const FLOOR = 0.1; // below this luminance: no dot (dark background)
const FADE_TOP = 0.03;
const FADE_BOTTOM = 0.15;

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
      smoothstep(FADE_TOP, FADE_TOP + 0.07, fy) * (1 - smoothstep(1 - FADE_BOTTOM, 1, fy));

    for (let x = 0; x < COLS; x++) {
      const v = data[y * COLS + x] / 255;
      if (v <= FLOOR) continue;

      // Bright subject on dark ground: radius grows with light.
      const t = Math.pow((v - FLOOR) / (1 - FLOOR), 0.85);
      const r = maxR * (0.08 + 0.92 * t) * (0.6 + 0.4 * edge);
      if (r < 0.35) continue;

      const cx = (x + 0.5) * cw;
      const cy = (y + 0.5) * ch;
      circles.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill-opacity="${(0.2 + 0.8 * edge).toFixed(2)}"/>`
      );
    }
  }

  const svg = (fill) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="${fill}">${circles.join('')}</g></svg>`;

  await sharp(Buffer.from(svg('#B4552F'))).png().toFile(`${OUT}/halftone-cinematic-clay.png`);
  await sharp(Buffer.from(svg('#14110F'))).png().toFile(`${OUT}/halftone-cinematic-ink.png`);
  console.log('ok', circles.length, 'dots');
})();
