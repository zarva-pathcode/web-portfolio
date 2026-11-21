const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/design/my-profile.png';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const W = 760;
const H = 880;
const COLS = 72;
const ROWS = 84;
const CROP = { left: 520, top: 40, width: 560, height: 646 };
const FADE_T = 0.03;
const FADE_B = 0.14;

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

(async () => {
  const { data } = await sharp(SRC)
    .extract(CROP)
    .grayscale()
    .blur(1)
    .resize(COLS, ROWS, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const at = (x, y) => data[Math.min(ROWS - 1, Math.max(0, y)) * COLS + Math.min(COLS - 1, Math.max(0, x))];

  // Large-radius mean → local detail only (background gradients vanish)
  const mean = new Float32Array(COLS * ROWS);
  const R = 7;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          s += at(x + dx, y + dy);
          n++;
        }
      }
      mean[y * COLS + x] = s / n;
    }
  }

  const cw = W / COLS;
  const ch = H / ROWS;
  const maxR = Math.min(cw, ch) * 0.58;
  const circles = [];

  for (let y = 0; y < ROWS; y++) {
    const fy = (y + 0.5) / ROWS;
    const edge = ss(FADE_T, FADE_T + 0.06, fy) * (1 - ss(1 - FADE_B, 1, fy));

    for (let x = 0; x < COLS; x++) {
      const v = data[y * COLS + x];
      const d = Math.abs(v - mean[y * COLS + x]) / 255; // detail strength
      const t = Math.min(1, Math.pow(d / 0.16, 0.85));
      if (t < 0.18) continue;

      const r = maxR * (0.1 + 0.9 * t) * (0.65 + 0.35 * edge);
      if (r < 0.35) continue;

      const cx = (x + 0.5) * cw;
      const cy = (y + 0.5) * ch;
      circles.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill-opacity="${(0.3 + 0.7 * edge).toFixed(2)}"/>`
      );
    }
  }

  const svg = (fill) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="${fill}">${circles.join('')}</g></svg>`;

  await sharp(Buffer.from(svg('#B4552F'))).png().toFile(`${OUT}/dot-myprofile-clay.png`);
  await sharp(Buffer.from(svg('#14110F'))).png().toFile(`${OUT}/dot-myprofile-ink.png`);
  console.log('ok', circles.length);
})();
