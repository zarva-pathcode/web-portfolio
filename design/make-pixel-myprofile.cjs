const sharp = require('sharp');

const SRC = 'D:/Zarva/project/web/portfolio/design/my-profile.png';
const OUT = 'D:/Zarva/project/web/portfolio/design';
const W = 760;
const H = 880;
const COLS = 76;
const ROWS = 88;
const CROP = { left: 420, top: 0, width: 752, height: 871 };
const GAMMA = 2.55;

const RAMP = [
  [0.0, [28, 22, 18]],
  [0.5, [92, 44, 29]],
  [0.78, [138, 61, 38]],
  [0.94, [199, 99, 64]],
  [1.0, [243, 239, 230]],
];

const lerp = (a, b, t) => a + (b - a) * t;
function rampAt(t) {
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0] || i === RAMP.length - 1) {
      const [t0, c0] = RAMP[i - 1];
      const [t1, c1] = RAMP[i];
      const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    }
  }
  return RAMP[0][1];
}

(async () => {
  const lifted = await sharp(SRC)
    .extract(CROP)
    .grayscale()
    .gamma(GAMMA)
    .normalize()
    .png()
    .toBuffer();

  const { data } = await sharp(lifted)
    .resize(COLS, ROWS, { fit: 'fill', kernel: 'nearest' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const small = Buffer.alloc(COLS * ROWS * 3);
  for (let i = 0; i < COLS * ROWS; i++) {
    const [r, g, b] = rampAt(Math.pow(data[i] / 255, 0.95));
    const o = i * 3;
    small[o] = r;
    small[o + 1] = g;
    small[o + 2] = b;
  }

  await sharp(small, { raw: { width: COLS, height: ROWS, channels: 3 } })
    .resize(W, H, { kernel: 'nearest' })
    .png()
    .toFile(`${OUT}/pixel-myprofile.png`);

  console.log('ok', COLS, 'x', ROWS, '→', W, 'x', H);
})();
