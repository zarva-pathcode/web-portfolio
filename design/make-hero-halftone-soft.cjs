const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/design/my-profile.png';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const W = 1140;
const H = 780;
const COLS = 122;
const ROWS = 84;
// taller crop (1.19:1) so the portrait reads less like a banner
const CROP = { left: 250, top: 55, width: 1100, height: 750 };
const GAMMA = 2.3;
const FADE_X = 0.2;
const FADE_Y = 0.16;

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

(async () => {
  const lift = await sharp(SRC)
    .extract(CROP)
    .grayscale()
    .gamma(GAMMA)
    .normalize()
    .blur(0.6)
    .png()
    .toBuffer();

  const { data, info } = await sharp(lift)
    .grayscale()
    .resize(COLS, ROWS, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cw = W / COLS;
  const ch = H / ROWS;
  const maxR = Math.min(cw, ch) * 0.58;
  const circles = [];

  for (let y = 0; y < ROWS; y++) {
    const fy = (y + 0.5) / ROWS;
    const my = ss(0, 0.12, fy) * (1 - ss(0.82, 1, fy));

    for (let x = 0; x < COLS; x++) {
      const v = data[(y * COLS + x) * info.channels] / 255;
      if (v > 0.9) continue;

      const fx = (x + 0.5) / COLS;
      const mx = ss(0, 0.18, fx) * (1 - ss(0.58, 1.0, fx));
      const mask = mx * my;
      if (mask < 0.04) continue;

      const t = Math.pow(1 - v, 1.15);
      const r = maxR * (0.05 + 0.95 * t) * (0.45 + 0.55 * mask);
      if (r < 0.3) continue;

      const cx = (x + 0.5) * cw;
      const cy = (y + 0.5) * ch;
      circles.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill-opacity="${((0.2 + 0.8 * t) * mask).toFixed(2)}"/>`
      );
    }
  }

  const svg = (fill) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="${fill}">${circles.join('')}</g></svg>`;

  await sharp(Buffer.from(svg('#B4552F'))).png().toFile(`${OUT}/hero-halftone-soft.png`);
  console.log('ok', circles.length, `${W}x${H}`);
})();
